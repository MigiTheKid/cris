"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";

export type AssignFormState = { error?: string; ok?: boolean };

const nowIso = () => new Date().toISOString();

/**
 * Define o motorista atual de um veículo (ou desatribui, se driverId vazio).
 * Respeita os índices únicos: um veículo tem no máx. 1 motorista ativo e um
 * motorista tem no máx. 1 veículo ativo — por isso encerramos os vínculos
 * abertos dos dois lados antes de abrir o novo.
 */
export async function saveAssignment(
  _prev: AssignFormState,
  formData: FormData,
): Promise<AssignFormState> {
  const vehicleId = String(formData.get("vehicleId") ?? "").trim();
  const driverId = String(formData.get("driverId") ?? "").trim();
  if (!vehicleId) return { error: "Veículo inválido." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada. Entre novamente." };

  // Já é o motorista atual? Nada a fazer.
  const { data: vehicleActive } = await supabase
    .from("vehicle_assignments")
    .select("id, driver_id")
    .eq("vehicle_id", vehicleId)
    .is("unassigned_at", null)
    .maybeSingle();
  if (driverId && vehicleActive?.driver_id === driverId) return { ok: true };

  // Encerra o vínculo ativo deste veículo (se houver).
  if (vehicleActive) {
    const { error } = await supabase
      .from("vehicle_assignments")
      .update({ unassigned_at: nowIso() })
      .eq("id", vehicleActive.id);
    if (error) return { error: `Não foi possível encerrar o vínculo atual: ${error.message}` };
  }

  if (driverId) {
    // Encerra o vínculo ativo do motorista em qualquer outro veículo.
    const { error: freeErr } = await supabase
      .from("vehicle_assignments")
      .update({ unassigned_at: nowIso() })
      .eq("driver_id", driverId)
      .is("unassigned_at", null);
    if (freeErr) return { error: `Não foi possível liberar o motorista: ${freeErr.message}` };

    const { error: insErr } = await supabase.from("vehicle_assignments").insert({
      vehicle_id: vehicleId,
      driver_id: driverId,
      created_by: user.id,
    });
    if (insErr) return { error: `Não foi possível atribuir: ${insErr.message}` };
  }

  await logAudit({
    action: driverId ? "assign" : "unassign",
    entity: "assignment",
    entityId: vehicleId,
    detail: { driverId: driverId || null },
  });
  revalidatePath(`/frota/${vehicleId}`);
  revalidatePath("/frota");
  revalidatePath("/motoristas");
  revalidatePath("/painel");
  return { ok: true };
}
