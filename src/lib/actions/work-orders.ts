"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";

export type WoFormState = { error?: string; ok?: boolean };

function int(v: unknown): number | null {
  const s = String(v ?? "")
    .replace(/\./g, "")
    .replace(/[^\d-]/g, "")
    .trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isInteger(n) ? n : null;
}

const REASONS = ["preventiva", "corretiva", "socorro", "acidente", "garantia"];
const UNITS = ["un", "jg", "par", "L", "kg", "h"];

type RawCost = {
  category?: string;
  label?: string;
  quantity?: unknown;
  unit?: string;
  cost?: unknown;
};
type RawItem = {
  serviceId?: string;
  label?: string;
  systemId?: unknown;
  description?: string;
  nextKm?: unknown;
  costs?: RawCost[];
};
type ParsedCost = {
  category: string;
  label: string;
  quantity: number | null;
  unit: string | null;
  cost: number;
};
type ParsedItem = {
  service_id: string | null;
  label: string;
  system_id: number;
  description: string | null;
  next_km: number | null;
  costs: ParsedCost[];
};

/** Lê os itens da OS (serviços + custos) do campo JSON do formulário. */
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
      const label = String(i.label ?? "").trim();
      const systemId = Number(i.systemId);
      const costs = (Array.isArray(i.costs) ? i.costs : [])
        .map((c): ParsedCost => {
          const cost = Number(c.cost);
          const qn = Number(c.quantity);
          return {
            category: c.category === "mao_de_obra" ? "mao_de_obra" : "peca",
            label: String(c.label ?? "").trim(),
            quantity: Number.isFinite(qn) && qn > 0 ? qn : null,
            unit: UNITS.includes(String(c.unit)) ? String(c.unit) : null,
            cost: Number.isFinite(cost) ? cost : 0,
          };
        })
        .filter((c) => c.label && c.cost > 0);
      return {
        service_id: String(i.serviceId ?? "").trim() || null,
        label,
        system_id: Number.isInteger(systemId) ? systemId : 0,
        description: String(i.description ?? "").trim() || null,
        next_km: int(i.nextKm),
        costs,
      };
    })
    .filter((i) => i.label && i.system_id > 0);
}

/** Registra (ou edita) uma ordem de serviço — registro direto, já concluída. */
export async function saveWorkOrder(_prev: WoFormState, formData: FormData): Promise<WoFormState> {
  const id = String(formData.get("id") ?? "").trim();
  const vehicleId = String(formData.get("vehicleId") ?? "").trim();
  const performedAt = String(formData.get("performedAt") ?? "").trim() || null;
  const odometerKm = int(formData.get("odometerKm"));
  const reason = String(formData.get("reason") ?? "corretiva");
  const vendorId = String(formData.get("vendorId") ?? "").trim() || null;
  const osRef = String(formData.get("osRef") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const photoPath = String(formData.get("photoPath") ?? "").trim() || null;
  const aiExtracted = formData.get("aiExtracted") === "1";
  const aiConfRaw = Number(formData.get("aiConfidence"));
  const aiConfidence = Number.isFinite(aiConfRaw) && aiConfRaw > 0 ? aiConfRaw : null;
  const items = parseItems(formData.get("items"));
  const total = items.reduce((s, i) => s + i.costs.reduce((c, x) => c + x.cost, 0), 0);

  if (!vehicleId) return { error: "Veículo inválido." };
  if (odometerKm == null || odometerKm < 0) return { error: "Informe o km do veículo." };
  if (!REASONS.includes(reason)) return { error: "Motivo inválido." };
  if (items.length === 0) return { error: "Adicione pelo menos um serviço." };
  for (const i of items) {
    if (i.next_km != null && i.next_km <= odometerKm)
      return { error: `A próxima de "${i.label}" deve ser maior que o km atual.` };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada. Entre novamente." };

  const payload = {
    vehicle_id: vehicleId,
    performed_at: performedAt,
    odometer_km: odometerKm,
    reason,
    vendor_id: vendorId,
    os_ref: osRef,
    cost: total, // total denormalizado (soma dos custos) para somas rápidas
    notes,
    ...(photoPath
      ? { photo_path: photoPath, ai_extracted: aiExtracted, ai_confidence: aiConfidence }
      : {}),
  };

  let orderId = id;
  if (id) {
    const { error } = await supabase.from("work_orders").update(payload).eq("id", id);
    if (error) return { error: `Não foi possível salvar: ${error.message}` };
    // Reescreve os itens (cascade apaga os custos junto).
    const { error: delErr } = await supabase
      .from("work_order_items")
      .delete()
      .eq("work_order_id", id);
    if (delErr) return { error: `Não foi possível atualizar os itens: ${delErr.message}` };
  } else {
    const { data: inserted, error } = await supabase
      .from("work_orders")
      .insert({ ...payload, created_by: user.id })
      .select("id")
      .single();
    if (error || !inserted) return { error: `Não foi possível salvar: ${error?.message ?? "?"}` };
    orderId = inserted.id;
  }

  for (const i of items) {
    const { costs, ...itemRow } = i;
    const { data: insItem, error: itErr } = await supabase
      .from("work_order_items")
      .insert({ ...itemRow, work_order_id: orderId })
      .select("id")
      .single();
    if (itErr || !insItem)
      return { error: `OS salva, mas um item falhou: ${itErr?.message ?? "?"}` };
    if (costs.length > 0) {
      const { error: cErr } = await supabase
        .from("work_order_costs")
        .insert(costs.map((c) => ({ ...c, item_id: insItem.id })));
      if (cErr) return { error: `OS salva, mas os custos falharam: ${cErr.message}` };
    }
  }

  await logAudit({
    action: id ? "update" : "create",
    entity: "work_order",
    entityId: vehicleId,
    detail: { odometerKm, reason, total, items: items.length },
  });
  revalidatePath(`/frota/${vehicleId}`);
  revalidatePath("/tma");
  return { ok: true };
}

/** Exclui uma ordem de serviço (correção de lançamento). */
export async function deleteWorkOrder(id: string, vehicleId: string): Promise<WoFormState> {
  if (!id) return { error: "Registro inválido." };
  const supabase = await createClient();
  const { error } = await supabase.from("work_orders").delete().eq("id", id);
  if (error) return { error: `Não foi possível excluir: ${error.message}` };
  await logAudit({ action: "delete", entity: "work_order", entityId: vehicleId });
  revalidatePath(`/frota/${vehicleId}`);
  revalidatePath("/tma");
  return { ok: true };
}
