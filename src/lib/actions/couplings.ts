"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";

export type CouplingFormState = { error?: string; ok?: boolean };

const nowIso = () => new Date().toISOString();

/**
 * Define o reboque engatado num cavalo (ou desengata, se trailerId vazio).
 * Mesmo padrão da atribuição de motorista: encerra os engates ativos dos dois
 * lados antes de abrir o novo (índices únicos: 1 reboque/cavalo e vice-versa).
 * A validação de tipos (só cavalo puxa, só reboque é puxado) é trigger no banco.
 */
export async function saveCoupling(
  _prev: CouplingFormState,
  formData: FormData,
): Promise<CouplingFormState> {
  const tractorId = String(formData.get("tractorId") ?? "").trim();
  const trailerId = String(formData.get("trailerId") ?? "").trim();
  if (!tractorId) return { error: "Veículo inválido." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada. Entre novamente." };

  // Já é o reboque atual? Nada a fazer.
  const { data: active } = await supabase
    .from("vehicle_couplings")
    .select("id, trailer_id")
    .eq("tractor_id", tractorId)
    .is("uncoupled_at", null)
    .maybeSingle();
  if (trailerId && active?.trailer_id === trailerId) return { ok: true };

  // Desengata o reboque atual deste cavalo (se houver).
  if (active) {
    const { error } = await supabase
      .from("vehicle_couplings")
      .update({ uncoupled_at: nowIso() })
      .eq("id", active.id);
    if (error) return { error: `Não foi possível desengatar o atual: ${error.message}` };
  }

  if (trailerId) {
    // Libera o reboque de qualquer outro cavalo.
    const { error: freeErr } = await supabase
      .from("vehicle_couplings")
      .update({ uncoupled_at: nowIso() })
      .eq("trailer_id", trailerId)
      .is("uncoupled_at", null);
    if (freeErr) return { error: `Não foi possível liberar o reboque: ${freeErr.message}` };

    const { error: insErr } = await supabase.from("vehicle_couplings").insert({
      tractor_id: tractorId,
      trailer_id: trailerId,
      created_by: user.id,
    });
    if (insErr) return { error: `Não foi possível engatar: ${insErr.message}` };
  }

  await logAudit({
    action: trailerId ? "couple" : "uncouple",
    entity: "coupling",
    entityId: tractorId,
    detail: { trailerId: trailerId || null },
  });
  revalidatePath(`/frota/${tractorId}`);
  if (trailerId) revalidatePath(`/frota/${trailerId}`);
  revalidatePath("/frota");
  revalidatePath("/painel");
  return { ok: true };
}
