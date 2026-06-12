"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";

export type ServiceFormState = { error?: string; ok?: boolean };

function revalidate() {
  revalidatePath("/tma");
  revalidatePath("/configuracoes");
  revalidatePath("/frota");
}

/** Cria ou edita um serviço do catálogo de manutenção. Equipe via RLS. */
export async function saveService(
  _prev: ServiceFormState,
  formData: FormData,
): Promise<ServiceFormState> {
  const id = String(formData.get("id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const systemId = Number(String(formData.get("systemId") ?? ""));
  const intervalRaw = String(formData.get("defaultIntervalKm") ?? "").replace(/\D/g, "");
  const defaultIntervalKm = intervalRaw ? Number(intervalRaw) : null;
  const isActive = id ? formData.get("isActive") === "on" : true;

  if (name.length < 3) return { error: "Informe o nome do serviço." };
  if (!Number.isInteger(systemId) || systemId <= 0) return { error: "Escolha o sistema." };

  const supabase = await createClient();
  const payload = {
    name,
    system_id: systemId,
    default_interval_km: defaultIntervalKm,
    is_active: isActive,
  };

  const { error } = id
    ? await supabase.from("service_catalog").update(payload).eq("id", id)
    : await supabase.from("service_catalog").insert(payload);
  if (error) {
    if (error.message.includes("uniq_service_name"))
      return { error: "Já existe um serviço com esse nome." };
    return { error: `Não foi possível salvar: ${error.message}` };
  }

  await logAudit({
    action: id ? "update" : "create",
    entity: "service_catalog",
    entityId: name,
    detail: { systemId },
  });
  revalidate();
  return { ok: true };
}

/** Exclui um serviço do catálogo. Itens de OS antigos guardam o nome (snapshot). */
export async function deleteService(id: string): Promise<ServiceFormState> {
  if (!id) return { error: "Serviço inválido." };
  const supabase = await createClient();

  // Solta o vínculo dos itens históricos (eles guardam label/sistema próprios).
  const { error: unlinkErr } = await supabase
    .from("work_order_items")
    .update({ service_id: null })
    .eq("service_id", id);
  if (unlinkErr) return { error: `Não foi possível excluir: ${unlinkErr.message}` };

  const { error } = await supabase.from("service_catalog").delete().eq("id", id);
  if (error) return { error: `Não foi possível excluir: ${error.message}` };

  await logAudit({ action: "delete", entity: "service_catalog", entityId: id });
  revalidate();
  return { ok: true };
}
