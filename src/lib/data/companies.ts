import { createClient } from "@/lib/supabase/server";
import { companyLabel } from "@/lib/labels";
import type { Database } from "@/lib/database.types";

export type CompanyRow = {
  id: string;
  kind: Database["public"]["Enums"]["company_kind"];
  kindLabel: string;
  legalName: string;
  cnpj: string | null;
  address: string | null;
};

/** Lista as empresas cadastradas. Cliente de sessão. */
export async function getCompanies(): Promise<CompanyRow[]> {
  const db = await createClient();
  const { data, error } = await db
    .from("companies")
    .select("id, kind, legal_name, cnpj, address")
    .order("kind");
  if (error) throw new Error(`getCompanies: ${error.message}`);

  return (data ?? []).map((c) => ({
    id: c.id,
    kind: c.kind,
    kindLabel: companyLabel(c.kind),
    legalName: c.legal_name,
    cnpj: c.cnpj,
    address: c.address,
  }));
}
