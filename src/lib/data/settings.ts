import { createClient } from "@/lib/supabase/server";
import { DEFAULT_TIRE_THRESHOLDS, DEFAULT_TIRE_CATALOG } from "@/lib/tires";
import type { TireThresholds, TireCatalog } from "@/lib/tires";

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

/** Catálogo controlado de marca/modelo/medida (Pneus → Catálogo). Padrão se ausente. */
export async function getTireCatalog(): Promise<TireCatalog> {
  const db = await createClient();
  const { data } = await db
    .from("app_settings")
    .select("value")
    .eq("key", "tire_catalog")
    .maybeSingle();
  const v = (data?.value ?? {}) as Partial<TireCatalog>;

  const brands = Array.isArray(v.brands) ? v.brands.filter((b) => typeof b === "string") : [];
  const sizes = Array.isArray(v.sizes) ? v.sizes.filter((s) => typeof s === "string") : [];
  const models = Array.isArray(v.models)
    ? v.models.filter(
        (m): m is { brand: string; name: string } =>
          !!m && typeof m.brand === "string" && typeof m.name === "string",
      )
    : [];

  // Sem nada salvo ainda → cai nos padrões de mercado para o sistema já nascer útil.
  if (brands.length === 0 && sizes.length === 0 && models.length === 0) {
    return DEFAULT_TIRE_CATALOG;
  }
  return { brands, sizes, models };
}
