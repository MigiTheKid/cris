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

const MAX_PDF_BYTES = 10 * 1024 * 1024; // 10 MB (mesmo limite do bucket)

/** Cria ou atualiza um documento de veículo (com PDF opcional no Storage). */
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
  const file = formData.get("file");

  if (!vehicleId) return { error: "Veículo inválido." };
  if (!DOC_TYPES.includes(docType)) return { error: "Selecione o tipo de documento." };
  if (issuedAt && expiresAt && expiresAt < issuedAt)
    return { error: "A validade não pode ser anterior à emissão." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada. Entre novamente." };

  // Upload do PDF (opcional). Path: vehicle/{vehicleId}/{docType}-{timestamp}.pdf
  let filePath: string | null = null;
  if (file instanceof File && file.size > 0) {
    if (file.type !== "application/pdf") return { error: "O arquivo precisa ser um PDF." };
    if (file.size > MAX_PDF_BYTES) return { error: "PDF acima de 10 MB. Reduza o arquivo." };
    filePath = `vehicle/${vehicleId}/${docType}-${Date.now()}.pdf`;
    const { error: upErr } = await supabase.storage
      .from("documents")
      .upload(filePath, file, { contentType: "application/pdf" });
    if (upErr) return { error: `Falha no upload do PDF: ${upErr.message}` };
  }

  const payload: {
    vehicle_id: string;
    doc_type: VehicleDocType;
    doc_number: string | null;
    issued_at: string | null;
    expires_at: string | null;
    file_path?: string;
  } = {
    vehicle_id: vehicleId,
    doc_type: docType,
    doc_number: docNumber,
    issued_at: issuedAt,
    expires_at: expiresAt,
  };
  if (filePath) payload.file_path = filePath; // só troca o arquivo se um novo subiu

  // Arquivo antigo (se vai ser substituído) — apagar do Storage depois do update.
  let oldPath: string | null = null;
  if (id && filePath) {
    const { data: existing } = await supabase
      .from("vehicle_documents")
      .select("file_path")
      .eq("id", id)
      .maybeSingle();
    oldPath = existing?.file_path ?? null;
  }

  const { error } = id
    ? await supabase.from("vehicle_documents").update(payload).eq("id", id)
    : await supabase.from("vehicle_documents").insert({ ...payload, created_by: user.id });

  if (error) {
    // Não deixa arquivo órfão se o registro falhou.
    if (filePath) await supabase.storage.from("documents").remove([filePath]);
    return { error: `Não foi possível salvar: ${error.message}` };
  }

  if (oldPath && oldPath !== filePath) {
    await supabase.storage.from("documents").remove([oldPath]);
  }

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
