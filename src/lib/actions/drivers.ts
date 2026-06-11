"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";

export type DriverProfileState = { error?: string; ok?: boolean };

function cleanDate(v: FormDataEntryValue | null): string | null {
  const s = String(v ?? "").trim();
  return s.length ? s : null;
}

/**
 * Edita os dados pessoais do motorista: nome/telefone (profiles) +
 * CNH/nascimento/admissão (driver_profiles). Cliente de sessão (staff via RLS).
 */
export async function saveDriverProfile(
  _prev: DriverProfileState,
  formData: FormData,
): Promise<DriverProfileState> {
  const driverId = String(formData.get("driverId") ?? "").trim();
  const fullName = String(formData.get("fullName") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const cnhCategory =
    String(formData.get("cnhCategory") ?? "")
      .trim()
      .toUpperCase() || null;
  const birthDate = cleanDate(formData.get("birthDate"));
  const hiredAt = cleanDate(formData.get("hiredAt"));

  if (!driverId) return { error: "Motorista inválido." };
  if (fullName.length < 3) return { error: "Informe o nome completo." };

  const supabase = await createClient();

  const { error: pErr } = await supabase
    .from("profiles")
    .update({ full_name: fullName, phone })
    .eq("id", driverId);
  if (pErr) return { error: `Não foi possível salvar: ${pErr.message}` };

  const { error: dErr } = await supabase
    .from("driver_profiles")
    .upsert(
      { profile_id: driverId, cnh_category: cnhCategory, birth_date: birthDate, hired_at: hiredAt },
      { onConflict: "profile_id" },
    );
  if (dErr) return { error: `Não foi possível salvar os dados: ${dErr.message}` };

  await logAudit({
    action: "update",
    entity: "user",
    entityId: driverId,
    detail: { name: fullName },
  });
  revalidatePath(`/motoristas/${driverId}`);
  revalidatePath("/motoristas");
  return { ok: true };
}
