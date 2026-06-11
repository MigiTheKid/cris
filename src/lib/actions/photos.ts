"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";

export type PhotoState = { error?: string; ok?: boolean };

const MAX_BYTES = 5 * 1024 * 1024;
const MIME_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

type Target = {
  table: "vehicles" | "profiles";
  idColumn: "id";
  folder: "vehicle" | "driver";
};

async function savePhoto(target: Target, ownerId: string, file: FormDataEntryValue | null) {
  if (!ownerId) return { error: "Registro inválido." };
  if (!(file instanceof File) || file.size === 0) return { error: "Selecione uma imagem." };
  const ext = MIME_EXT[file.type];
  if (!ext) return { error: "Use uma imagem JPG, PNG ou WebP." };
  if (file.size > MAX_BYTES) return { error: "Imagem acima de 5 MB. Reduza o arquivo." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada. Entre novamente." };

  // Caminho versionado pelo timestamp evita cache preso ao trocar a foto.
  const filePath = `${target.folder}/${ownerId}-${Date.now()}.${ext}`;
  const { error: upErr } = await supabase.storage
    .from("photos")
    .upload(filePath, file, { contentType: file.type });
  if (upErr) return { error: `Falha no upload: ${upErr.message}` };

  // Caminho antigo (para remover depois do update).
  const { data: existing } = await supabase
    .from(target.table)
    .select("photo_path")
    .eq(target.idColumn, ownerId)
    .maybeSingle();
  const oldPath = existing?.photo_path ?? null;

  const { error } = await supabase
    .from(target.table)
    .update({ photo_path: filePath })
    .eq(target.idColumn, ownerId);
  if (error) {
    await supabase.storage.from("photos").remove([filePath]);
    return { error: `Não foi possível salvar: ${error.message}` };
  }

  if (oldPath && oldPath !== filePath) {
    await supabase.storage.from("photos").remove([oldPath]);
  }
  return { ok: true as const };
}

/** Sobe/troca a foto de um veículo. */
export async function uploadVehiclePhoto(
  _prev: PhotoState,
  formData: FormData,
): Promise<PhotoState> {
  const id = String(formData.get("vehicleId") ?? "").trim();
  const res = await savePhoto(
    { table: "vehicles", idColumn: "id", folder: "vehicle" },
    id,
    formData.get("file"),
  );
  if (res.error) return res;
  await logAudit({ action: "update", entity: "vehicle", entityId: id, detail: { photo: true } });
  revalidatePath(`/frota/${id}`);
  revalidatePath("/frota");
  return { ok: true };
}

/** Sobe/troca a foto de um motorista. */
export async function uploadDriverPhoto(
  _prev: PhotoState,
  formData: FormData,
): Promise<PhotoState> {
  const id = String(formData.get("driverId") ?? "").trim();
  const res = await savePhoto(
    { table: "profiles", idColumn: "id", folder: "driver" },
    id,
    formData.get("file"),
  );
  if (res.error) return res;
  await logAudit({ action: "update", entity: "user", entityId: id, detail: { photo: true } });
  revalidatePath(`/motoristas/${id}`);
  revalidatePath("/motoristas");
  return { ok: true };
}
