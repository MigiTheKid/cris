import { createClient } from "@/lib/supabase/server";

export type DocTypeScope = "vehicle" | "driver" | "company";

export type DocumentType = {
  key: string;
  scope: DocTypeScope;
  label: string;
  description: string | null;
  isActive: boolean;
  sort: number;
};

/** Tipos de documento do catálogo. `onlyActive` para dropdowns. */
export async function getDocumentTypes(
  scope?: DocTypeScope,
  onlyActive = false,
): Promise<DocumentType[]> {
  const db = await createClient();
  let q = db.from("document_types").select("*").order("sort").order("label");
  if (scope) q = q.eq("scope", scope);
  if (onlyActive) q = q.eq("is_active", true);
  const { data, error } = await q;
  if (error) throw new Error(`getDocumentTypes: ${error.message}`);
  return (data ?? []).map((d) => ({
    key: d.key,
    scope: d.scope as DocTypeScope,
    label: d.label,
    description: d.description,
    isActive: d.is_active,
    sort: d.sort,
  }));
}
