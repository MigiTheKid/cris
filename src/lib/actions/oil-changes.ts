"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";

export type OilFormState = { error?: string; ok?: boolean };

function int(v: FormDataEntryValue | null): number | null {
  const s = String(v ?? "")
    .replace(/\./g, "")
    .replace(/[^\d-]/g, "")
    .trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isInteger(n) ? n : null;
}

type RawItem = {
  category?: string;
  label?: string;
  quantity?: unknown;
  unit?: string;
  cost?: unknown;
};
type ParsedItem = {
  category: string;
  label: string;
  quantity: number | null;
  unit: string | null;
  cost: number;
};

const UNITS = ["un", "L", "kg", "h"];

/** Lê os itens de custo (insumos + mão de obra) do campo JSON; só os com valor > 0. */
function parseItems(raw: FormDataEntryValue | null): ParsedItem[] {
  let arr: RawItem[];
  try {
    arr = JSON.parse(String(raw ?? "[]"));
  } catch {
    return [];
  }
  if (!Array.isArray(arr)) return [];
  return arr
    .map((i) => {
      const category = i.category === "mao_de_obra" ? "mao_de_obra" : "insumo";
      const label = String(i.label ?? "").trim();
      const cost = Number(i.cost);
      const qn = Number(i.quantity);
      const quantity = Number.isFinite(qn) && qn > 0 ? qn : null;
      const unit = UNITS.includes(String(i.unit)) ? String(i.unit) : null;
      return { category, label, quantity, unit, cost: Number.isFinite(cost) ? cost : 0 };
    })
    .filter((i) => i.label && i.cost > 0);
}

/** Registra (ou edita) uma troca de óleo de um veículo. */
export async function saveOilChange(
  _prev: OilFormState,
  formData: FormData,
): Promise<OilFormState> {
  const id = String(formData.get("id") ?? "").trim();
  const vehicleId = String(formData.get("vehicleId") ?? "").trim();
  const changedAt = String(formData.get("changedAt") ?? "").trim() || null;
  const odometerKm = int(formData.get("odometerKm"));
  const nextKm = int(formData.get("nextKm"));
  const oilSpec = String(formData.get("oilSpec") ?? "").trim() || null;
  const filterChanged = formData.get("filterChanged") === "on";
  const vendorId = String(formData.get("vendorId") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const items = parseItems(formData.get("items"));
  const total = items.reduce((s, i) => s + i.cost, 0);

  if (!vehicleId) return { error: "Veículo inválido." };
  if (odometerKm == null || odometerKm < 0) return { error: "Informe o km da troca." };
  if (nextKm != null && nextKm <= odometerKm)
    return { error: "A próxima troca deve ser maior que o km da troca." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada. Entre novamente." };

  const payload = {
    vehicle_id: vehicleId,
    changed_at: changedAt,
    odometer_km: odometerKm,
    next_km: nextKm,
    oil_spec: oilSpec,
    filter_changed: filterChanged,
    vendor_id: vendorId,
    cost: total, // total denormalizado (soma dos itens) para somas rápidas
    notes,
  };

  let changeId = id;
  if (id) {
    const { error } = await supabase.from("oil_changes").update(payload).eq("id", id);
    if (error) return { error: `Não foi possível salvar: ${error.message}` };
  } else {
    const { data: inserted, error } = await supabase
      .from("oil_changes")
      .insert({ ...payload, created_by: user.id })
      .select("id")
      .single();
    if (error || !inserted) return { error: `Não foi possível salvar: ${error?.message ?? "?"}` };
    changeId = inserted.id;
  }

  // Reescreve os itens de custo desta troca (insumos + mão de obra).
  await supabase.from("oil_change_items").delete().eq("oil_change_id", changeId);
  if (items.length > 0) {
    const { error: itErr } = await supabase
      .from("oil_change_items")
      .insert(items.map((i) => ({ oil_change_id: changeId, ...i })));
    if (itErr) return { error: `Troca salva, mas os custos falharam: ${itErr.message}` };
  }

  await logAudit({
    action: id ? "update" : "create",
    entity: "oil_change",
    entityId: vehicleId,
    detail: { odometerKm, nextKm, total },
  });
  revalidatePath(`/frota/${vehicleId}`);
  return { ok: true };
}

/** Exclui uma troca de óleo (correção de lançamento). */
export async function deleteOilChange(id: string, vehicleId: string): Promise<OilFormState> {
  if (!id) return { error: "Registro inválido." };
  const supabase = await createClient();
  const { error } = await supabase.from("oil_changes").delete().eq("id", id);
  if (error) return { error: `Não foi possível excluir: ${error.message}` };
  await logAudit({ action: "delete", entity: "oil_change", entityId: vehicleId });
  revalidatePath(`/frota/${vehicleId}`);
  return { ok: true };
}
