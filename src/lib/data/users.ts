import { createClient } from "@/lib/supabase/server";
import { maskCpf } from "@/lib/data/drivers";
import type { Database } from "@/lib/database.types";

type Role = Database["public"]["Enums"]["user_role"];

const ROLE_LABEL: Record<Role, string> = {
  admin: "Administrador",
  manager: "Gerente",
  driver: "Motorista",
};

const ROLE_ORDER: Record<Role, number> = { admin: 0, manager: 1, driver: 2 };

export type UserRow = {
  id: string;
  cpf: string;
  name: string;
  role: Role;
  roleLabel: string;
  phone: string | null;
  isActive: boolean;
};

/** Lista todos os usuários (perfis) para a tela de Configurações. Cliente de sessão. */
export async function getUserList(): Promise<UserRow[]> {
  const db = await createClient();
  const { data, error } = await db
    .from("profiles")
    .select("id, cpf, full_name, role, phone, is_active")
    .order("full_name");
  if (error) throw new Error(`getUserList: ${error.message}`);

  return (data ?? [])
    .map((p) => ({
      id: p.id,
      cpf: maskCpf(p.cpf),
      name: p.full_name,
      role: p.role,
      roleLabel: ROLE_LABEL[p.role],
      phone: p.phone,
      isActive: p.is_active,
    }))
    .sort((a, b) => ROLE_ORDER[a.role] - ROLE_ORDER[b.role] || a.name.localeCompare(b.name));
}
