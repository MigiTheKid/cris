"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export type CompanyFormState = { error?: string; ok?: boolean };

/** Edita os dados cadastrais de uma empresa (razão social, CNPJ, endereço). */
export async function saveCompany(
  _prev: CompanyFormState,
  formData: FormData,
): Promise<CompanyFormState> {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "admin") {
    return { error: "Apenas administradores podem editar empresas." };
  }

  const id = String(formData.get("id") ?? "").trim();
  const legalName = String(formData.get("legalName") ?? "").trim();
  const cnpj = String(formData.get("cnpj") ?? "").trim() || null;
  const address = String(formData.get("address") ?? "").trim() || null;

  if (!id) return { error: "Empresa inválida." };
  if (legalName.length < 2) return { error: "Informe a razão social." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("companies")
    .update({ legal_name: legalName, cnpj, address })
    .eq("id", id);
  if (error) return { error: `Não foi possível salvar: ${error.message}` };

  await logAudit({ action: "update", entity: "company", entityId: id, detail: { legalName } });
  revalidatePath("/configuracoes");
  revalidatePath("/frota");
  return { ok: true };
}
