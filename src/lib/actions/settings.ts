"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import type { TireCatalog, TireModel } from "@/lib/tires";

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

/** Normaliza um nome: tira espaços duplicados e bordas. Mantém a grafia do usuário. */
function clean(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

/** Dedup case-insensitive preservando a primeira grafia e a ordem. */
function dedupe(items: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of items) {
    const v = clean(raw);
    if (!v) continue;
    const key = v.toLocaleLowerCase("pt-BR");
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(v);
  }
  return out;
}

/**
 * Salva o catálogo controlado de pneus (Pneus → Catálogo). Staff (admin/gestor).
 * Escreve via service role porque a policy de escrita do app_settings é admin-only.
 */
export async function saveTireCatalog(
  _prev: SettingsFormState,
  formData: FormData,
): Promise<SettingsFormState> {
  const profile = await getCurrentProfile();
  if (!profile || profile.role === "driver") {
    return { error: "Apenas a equipe interna pode gerenciar o catálogo." };
  }

  let parsed: Partial<TireCatalog>;
  try {
    parsed = JSON.parse(String(formData.get("catalog") ?? "{}"));
  } catch {
    return { error: "Catálogo inválido." };
  }

  const brands = dedupe(Array.isArray(parsed.brands) ? parsed.brands.map(String) : []);
  const sizes = dedupe(Array.isArray(parsed.sizes) ? parsed.sizes.map(String) : []);

  // Modelos: dedup por (marca + nome); descarta modelo cuja marca não existe na lista.
  const brandSet = new Set(brands.map((b) => b.toLocaleLowerCase("pt-BR")));
  const seenModel = new Set<string>();
  const models: TireModel[] = [];
  for (const m of Array.isArray(parsed.models) ? parsed.models : []) {
    const brand = clean(String(m?.brand ?? ""));
    const name = clean(String(m?.name ?? ""));
    if (!brand || !name) continue;
    if (!brandSet.has(brand.toLocaleLowerCase("pt-BR"))) continue;
    const key = `${brand.toLocaleLowerCase("pt-BR")}|${name.toLocaleLowerCase("pt-BR")}`;
    if (seenModel.has(key)) continue;
    seenModel.add(key);
    models.push({ brand, name });
  }

  if (brands.length === 0 && sizes.length === 0) {
    return { error: "Cadastre ao menos uma marca e uma medida." };
  }

  const value = { brands, sizes, models };
  const admin = createAdminClient();
  const { error } = await admin
    .from("app_settings")
    .upsert({ key: "tire_catalog", value, updated_by: profile.id }, { onConflict: "key" });
  if (error) return { error: `Não foi possível salvar: ${error.message}` };

  await logAudit({
    action: "update",
    entity: "settings",
    entityId: "tire_catalog",
    detail: { brands: brands.length, sizes: sizes.length, models: models.length },
  });
  revalidatePath("/pneus");
  revalidatePath("/frota");
  return { ok: true };
}
