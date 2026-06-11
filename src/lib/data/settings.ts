import { createClient } from "@/lib/supabase/server";
import { DEFAULT_TIRE_THRESHOLDS, type TireThresholds } from "@/lib/tires";

/** Limiares de sulco configurados (Configurações → Pneus). Cai no padrão se ausente. */
export async function getTireThresholds(): Promise<TireThresholds> {
  const db = await createClient();
  const { data } = await db
    .from("app_settings")
    .select("value")
    .eq("key", "tire_thresholds")
    .maybeSingle();
  const v = (data?.value ?? {}) as { ok_mm?: number; recap_mm?: number };
  const okMm = typeof v.ok_mm === "number" ? v.ok_mm : DEFAULT_TIRE_THRESHOLDS.okMm;
  const recapMm = typeof v.recap_mm === "number" ? v.recap_mm : DEFAULT_TIRE_THRESHOLDS.recapMm;
  return { okMm, recapMm };
}
