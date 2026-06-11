import { createClient } from "@/lib/supabase/server";

export type Vendor = {
  id: string;
  name: string;
  kind: "troca_oleo" | "manutencao" | "ambos";
  phone: string | null;
  city: string | null;
  notes: string | null;
  isActive: boolean;
};

export const VENDOR_KIND_LABEL: Record<string, string> = {
  troca_oleo: "Troca de óleo",
  manutencao: "Manutenção",
  ambos: "Ambos",
};

/** Lista de oficinas (fornecedores). Cliente de sessão. */
export async function getVendors(): Promise<Vendor[]> {
  const db = await createClient();
  const { data } = await db
    .from("vendors")
    .select("id, name, kind, phone, city, notes, is_active")
    .order("name");
  return (data ?? []).map((v) => ({
    id: v.id,
    name: v.name,
    kind: v.kind as Vendor["kind"],
    phone: v.phone,
    city: v.city,
    notes: v.notes,
    isActive: v.is_active,
  }));
}
