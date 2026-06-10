"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type DocTypeFormState = { error?: string; ok?: boolean };

/** Gera uma chave estável a partir do nome (ex.: "Laudo Fumaça" → "laudo_fumaca"). */
function slugify(label: string): string {
  return label
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
}

function revalidateAll() {
  revalidatePath("/configuracoes");
  revalidatePath("/frota");
  revalidatePath("/painel");
}

/** Cria ou atualiza um tipo de documento do catálogo. */
export async function saveDocumentType(
  _prev: DocTypeFormState,
  formData: FormData,
): Promise<DocTypeFormState> {
  const key = String(formData.get("key") ?? "").trim(); // vazio = criação
  const label = String(formData.get("label") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const scope = String(formData.get("scope") ?? "vehicle");
  const sortRaw = String(formData.get("sort") ?? "").trim();

  if (label.length < 2) return { error: "Informe o nome do tipo (mín. 2 letras)." };
  if (!["vehicle", "driver", "company"].includes(scope)) return { error: "Escopo inválido." };
  const sort = sortRaw ? Number(sortRaw) : 100;
  if (!Number.isInteger(sort) || sort < 0) return { error: "Ordem inválida." };

  const supabase = await createClient();

  if (key) {
    // Edição: key é imutável (identifica documentos já lançados).
    const { error } = await supabase
      .from("document_types")
      .update({ label, description, sort })
      .eq("key", key);
    if (error) return { error: `Não foi possível salvar: ${error.message}` };
    revalidateAll();
    return { ok: true };
  }

  // Criação: deriva a key do nome; em colisão, sufixa.
  const base = slugify(label) || "tipo";
  for (let i = 0; i < 5; i++) {
    const candidate = i === 0 ? base : `${base}_${i + 1}`;
    const { error } = await supabase
      .from("document_types")
      .insert({ key: candidate, scope, label, description, sort });
    if (!error) {
      revalidateAll();
      return { ok: true };
    }
    if (!error.message.includes("document_types_pkey"))
      return { error: `Não foi possível criar: ${error.message}` };
  }
  return { error: "Já existem muitos tipos com esse nome. Use outro nome." };
}

/** Ativa/desativa um tipo (inativo some dos dropdowns; histórico fica). */
export async function toggleDocumentType(key: string, isActive: boolean): Promise<void> {
  const supabase = await createClient();
  await supabase.from("document_types").update({ is_active: isActive }).eq("key", key);
  revalidateAll();
}
