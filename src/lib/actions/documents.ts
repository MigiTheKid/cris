"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/database.types";

type VehicleDocType = Database["public"]["Enums"]["vehicle_doc_type"];

const DOC_TYPES: VehicleDocType[] = [
  "crlv",
  "cipp",
  "inmetro",
  "tara",
  "lac",
  "modal_rodoviario",
  "cert_regularidade",
  "outro",
];

export type DocFormState = { error?: string; ok?: boolean };

function cleanDate(v: FormDataEntryValue | null): string | null {
  const s = String(v ?? "").trim();
  return s.length ? s : null;
}

/** Cria ou atualiza um documento de veículo. */
export async function saveVehicleDocument(
  _prev: DocFormState,
  formData: FormData,
): Promise<DocFormState> {
  const id = String(formData.get("id") ?? "").trim();
  const vehicleId = String(formData.get("vehicleId") ?? "").trim();
  const docType = String(formData.get("docType") ?? "").trim() as VehicleDocType;
  const docNumber = String(formData.get("docNumber") ?? "").trim() || null;
  const issuedAt = cleanDate(formData.get("issuedAt"));
  const expiresAt = cleanDate(formData.get("expiresAt"));

  if (!vehicleId) return { error: "Veículo inválido." };
  if (!DOC_TYPES.includes(docType)) return { error: "Selecione o tipo de documento." };
  if (issuedAt && expiresAt && expiresAt < issuedAt)
    return { error: "A validade não pode ser anterior à emissão." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada. Entre novamente." };

  const payload = {
    vehicle_id: vehicleId,
    doc_type: docType,
    doc_number: docNumber,
    issued_at: issuedAt,
    expires_at: expiresAt,
  };

  const { error } = id
    ? await supabase.from("vehicle_documents").update(payload).eq("id", id)
    : await supabase.from("vehicle_documents").insert({ ...payload, created_by: user.id });

  if (error) return { error: `Não foi possível salvar: ${error.message}` };

  revalidatePath(`/frota/${vehicleId}`);
  revalidatePath("/frota");
  revalidatePath("/painel");
  return { ok: true };
}

/** Remove (soft delete) um documento de veículo. */
export async function deleteVehicleDocument(id: string, vehicleId: string): Promise<DocFormState> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("vehicle_documents")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath(`/frota/${vehicleId}`);
  revalidatePath("/frota");
  revalidatePath("/painel");
  return { ok: true };
}
