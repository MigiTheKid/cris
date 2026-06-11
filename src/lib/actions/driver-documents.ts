"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";
import type { DocFormState } from "./documents";

function cleanDate(v: FormDataEntryValue | null): string | null {
  const s = String(v ?? "").trim();
  return s.length ? s : null;
}

const MAX_PDF_BYTES = 10 * 1024 * 1024;

/** Cria ou atualiza um documento de motorista (com PDF opcional no Storage). */
export async function saveDriverDocument(
  _prev: DocFormState,
  formData: FormData,
): Promise<DocFormState> {
  const id = String(formData.get("id") ?? "").trim();
  const driverId = String(formData.get("driverId") ?? "").trim();
  const docType = String(formData.get("docType") ?? "").trim();
  const docNumber = String(formData.get("docNumber") ?? "").trim() || null;
  const issuedAt = cleanDate(formData.get("issuedAt"));
  const expiresAt = cleanDate(formData.get("expiresAt"));
  const file = formData.get("file");

  if (!driverId) return { error: "Motorista inválido." };
  if (!docType) return { error: "Selecione o tipo de documento." };
  if (issuedAt && expiresAt && expiresAt < issuedAt)
    return { error: "A validade não pode ser anterior à emissão." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada. Entre novamente." };

  let filePath: string | null = null;
  if (file instanceof File && file.size > 0) {
    if (file.type !== "application/pdf") return { error: "O arquivo precisa ser um PDF." };
    if (file.size > MAX_PDF_BYTES) return { error: "PDF acima de 10 MB. Reduza o arquivo." };
    filePath = `driver/${driverId}/${docType}-${Date.now()}.pdf`;
    const { error: upErr } = await supabase.storage
      .from("documents")
      .upload(filePath, file, { contentType: "application/pdf" });
    if (upErr) return { error: `Falha no upload do PDF: ${upErr.message}` };
  }

  const payload: {
    driver_id: string;
    doc_type: string;
    doc_number: string | null;
    issued_at: string | null;
    expires_at: string | null;
    file_path?: string;
  } = {
    driver_id: driverId,
    doc_type: docType,
    doc_number: docNumber,
    issued_at: issuedAt,
    expires_at: expiresAt,
  };
  if (filePath) payload.file_path = filePath;

  let oldPath: string | null = null;
  if (id && filePath) {
    const { data: existing } = await supabase
      .from("driver_documents")
      .select("file_path")
      .eq("id", id)
      .maybeSingle();
    oldPath = existing?.file_path ?? null;
  }

  const { error } = id
    ? await supabase.from("driver_documents").update(payload).eq("id", id)
    : await supabase.from("driver_documents").insert({ ...payload, created_by: user.id });

  if (error) {
    if (filePath) await supabase.storage.from("documents").remove([filePath]);
    return { error: `Não foi possível salvar: ${error.message}` };
  }

  if (oldPath && oldPath !== filePath) {
    await supabase.storage.from("documents").remove([oldPath]);
  }

  await logAudit({
    action: id ? "update" : "create",
    entity: "driver_document",
    entityId: driverId,
    detail: { docType },
  });
  revalidatePath(`/motoristas/${driverId}`);
  revalidatePath("/motoristas");
  revalidatePath("/painel");
  return { ok: true };
}

/** Remove (soft delete) um documento de motorista. */
export async function deleteDriverDocument(id: string, driverId: string): Promise<DocFormState> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("driver_documents")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { error: error.message };
  await logAudit({ action: "delete", entity: "driver_document", entityId: driverId });
  revalidatePath(`/motoristas/${driverId}`);
  revalidatePath("/motoristas");
  revalidatePath("/painel");
  return { ok: true };
}
