"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export type SettingsFormState = { error?: string; ok?: boolean };

/** Sulco legal mínimo (CONTRAN): limiar de retirada não pode ficar abaixo disso. */
const LEGAL_MIN_MM = 1.6;

function num(v: FormDataEntryValue | null): number | null {
  const s = String(v ?? "")
    .trim()
    .replace(",", ".");
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** Salva os limiares de sulco dos pneus (Configurações → Pneus). Admin-only. */
export async function saveTireThresholds(
  _prev: SettingsFormState,
  formData: FormData,
): Promise<SettingsFormState> {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "admin") {
    return { error: "Apenas administradores podem alterar parâmetros." };
  }

  const okMm = num(formData.get("okMm"));
  const recapMm = num(formData.get("recapMm"));

  if (okMm == null || recapMm == null) return { error: "Informe os dois valores em mm." };
  if (recapMm < LEGAL_MIN_MM)
    return { error: `O limiar de retirada não pode ficar abaixo do legal (${LEGAL_MIN_MM} mm).` };
  if (okMm <= recapMm)
    return { error: "O limiar verde precisa ser maior que o limiar de retirada." };
  if (okMm > 30) return { error: "Valor de sulco improvável (máx. 30 mm)." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("app_settings")
    .update({ value: { ok_mm: okMm, recap_mm: recapMm }, updated_by: profile.id })
    .eq("key", "tire_thresholds");
  if (error) return { error: `Não foi possível salvar: ${error.message}` };

  await logAudit({
    action: "update",
    entity: "settings",
    entityId: "tire_thresholds",
    detail: { okMm, recapMm },
  });
  revalidatePath("/configuracoes");
  revalidatePath("/pneus");
  revalidatePath("/frota");
  return { ok: true };
}
