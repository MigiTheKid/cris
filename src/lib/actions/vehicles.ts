"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";
import type { Database } from "@/lib/database.types";

type VehicleType = Database["public"]["Enums"]["vehicle_type"];
type VehicleStatus = Database["public"]["Enums"]["vehicle_status"];
type CompanyKind = Database["public"]["Enums"]["company_kind"];

const VEHICLE_TYPES: VehicleType[] = [
  "cavalo",
  "truck",
  "toco",
  "bitruck",
  "leve",
  "semi_reboque",
  "reboque",
];
const STATUSES: VehicleStatus[] = ["ativo", "inativo", "em_manutencao"];
const COMPANY_KINDS: CompanyKind[] = ["top_diesel", "posto_planeta"];

export type VehicleFormState = { error?: string; ok?: boolean; id?: string };

/** Cria ou atualiza um veículo da frota. */
export async function saveVehicle(
  _prev: VehicleFormState,
  formData: FormData,
): Promise<VehicleFormState> {
  const id = String(formData.get("id") ?? "").trim();
  const plate = String(formData.get("plate") ?? "")
    .trim()
    .toUpperCase();
  const model = String(formData.get("model") ?? "").trim() || null;
  const yearRaw = String(formData.get("year") ?? "").trim();
  const vehicleType = String(formData.get("vehicleType") ?? "") as VehicleType;
  const capacity = String(formData.get("capacity") ?? "").trim() || null;
  const companyKind = String(formData.get("companyKind") ?? "") as CompanyKind;
  const status = String(formData.get("status") ?? "ativo") as VehicleStatus;

  if (plate.length < 7) return { error: "Informe a placa (ex.: ABC-1D23)." };
  if (!VEHICLE_TYPES.includes(vehicleType)) return { error: "Selecione o tipo do veículo." };
  if (!COMPANY_KINDS.includes(companyKind)) return { error: "Selecione a empresa proprietária." };
  if (!STATUSES.includes(status)) return { error: "Situação inválida." };

  let year: number | null = null;
  if (yearRaw) {
    year = Number(yearRaw);
    if (!Number.isInteger(year) || year < 1950 || year > 2100) return { error: "Ano inválido." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada. Entre novamente." };

  const { data: company } = await supabase
    .from("companies")
    .select("id")
    .eq("kind", companyKind)
    .single();
  if (!company) return { error: "Empresa não encontrada." };

  const payload = {
    plate,
    model,
    year,
    vehicle_type: vehicleType,
    capacity,
    company_id: company.id,
    status,
  };

  if (id) {
    const { error } = await supabase.from("vehicles").update(payload).eq("id", id);
    if (error) return { error: friendly(error.message) };
    await logAudit({ action: "update", entity: "vehicle", entityId: id, detail: { plate } });
    revalidatePath(`/frota/${id}`);
    revalidatePath("/frota");
    revalidatePath("/painel");
    return { ok: true, id };
  }

  const { data: inserted, error } = await supabase
    .from("vehicles")
    .insert({ ...payload, created_by: user.id })
    .select("id")
    .single();
  if (error || !inserted) return { error: friendly(error?.message ?? "erro desconhecido") };

  await logAudit({ action: "create", entity: "vehicle", entityId: inserted.id, detail: { plate } });
  revalidatePath("/frota");
  revalidatePath("/painel");
  return { ok: true, id: inserted.id };
}

function friendly(msg: string): string {
  if (msg.includes("vehicles_plate_key")) return "Já existe um veículo com essa placa.";
  return `Não foi possível salvar: ${msg}`;
}
