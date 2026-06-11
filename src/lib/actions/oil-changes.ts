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

function money(v: FormDataEntryValue | null): number | null {
  const s = String(v ?? "")
    .trim()
    .replace(/\./g, "")
    .replace(",", ".");
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
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
  const vendor = String(formData.get("vendor") ?? "").trim() || null;
  const cost = money(formData.get("cost"));
  const notes = String(formData.get("notes") ?? "").trim() || null;

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
    vendor,
    cost,
    notes,
  };

  const { error } = id
    ? await supabase.from("oil_changes").update(payload).eq("id", id)
    : await supabase.from("oil_changes").insert({ ...payload, created_by: user.id });
  if (error) return { error: `Não foi possível salvar: ${error.message}` };

  await logAudit({
    action: id ? "update" : "create",
    entity: "oil_change",
    entityId: vehicleId,
    detail: { odometerKm, nextKm },
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
