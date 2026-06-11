"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";

export type VendorFormState = { error?: string; ok?: boolean };

const KINDS = ["troca_oleo", "manutencao", "ambos"];

function revalidate() {
  revalidatePath("/tma");
  revalidatePath("/configuracoes");
  revalidatePath("/frota");
}

/** Cria ou edita uma oficina (fornecedor). Equipe via RLS. */
export async function saveVendor(
  _prev: VendorFormState,
  formData: FormData,
): Promise<VendorFormState> {
  const id = String(formData.get("id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const kind = String(formData.get("kind") ?? "ambos");
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const city = String(formData.get("city") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const isActive = id ? formData.get("isActive") === "on" : true;

  if (name.length < 2) return { error: "Informe o nome da oficina." };
  if (!KINDS.includes(kind)) return { error: "Tipo inválido." };

  const supabase = await createClient();
  const payload = { name, kind, phone, city, notes, is_active: isActive };

  const { error } = id
    ? await supabase.from("vendors").update(payload).eq("id", id)
    : await supabase.from("vendors").insert(payload);
  if (error) {
    if (error.message.includes("uniq_vendor_name"))
      return { error: "Já existe uma oficina com esse nome." };
    return { error: `Não foi possível salvar: ${error.message}` };
  }

  await logAudit({
    action: id ? "update" : "create",
    entity: "vendor",
    entityId: name,
    detail: { kind },
  });
  revalidate();
  return { ok: true };
}

/** Exclui uma oficina. Bloqueado (RESTRICT) se já houver troca vinculada — aí desative. */
export async function deleteVendor(id: string): Promise<VendorFormState> {
  if (!id) return { error: "Oficina inválida." };
  const supabase = await createClient();
  const { error } = await supabase.from("vendors").delete().eq("id", id);
  if (error) {
    console.error("deleteVendor:", error.message);
    return {
      error:
        "Não foi possível excluir — esta oficina já está em registros de troca. " +
        "Você pode desativá-la (some das listas, preserva o histórico).",
    };
  }
  await logAudit({ action: "delete", entity: "vendor", entityId: id });
  revalidate();
  return { ok: true };
}
