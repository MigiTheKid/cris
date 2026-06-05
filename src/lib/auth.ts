import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/database.types";

/** Domínio do e-mail sintético interno (deve casar com o seed). */
export const AUTH_DOMAIN = "auth.topdiesel.local";

/** Converte CPF (com ou sem máscara) no e-mail sintético de login. */
export function cpfToEmail(cpf: string): string {
  const digits = cpf.replace(/\D/g, "");
  return `${digits}@${AUTH_DOMAIN}`;
}

export type CurrentProfile = {
  id: string;
  fullName: string;
  role: Database["public"]["Enums"]["user_role"];
  mustChangePassword: boolean;
};

/**
 * Perfil do usuário autenticado (ou null). Usa getUser() — valida no servidor.
 * Server Components / Server Actions apenas.
 */
export async function getCurrentProfile(): Promise<CurrentProfile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, role, must_change_password")
    .eq("id", user.id)
    .single();
  if (!profile) return null;

  return {
    id: profile.id,
    fullName: profile.full_name,
    role: profile.role,
    mustChangePassword: profile.must_change_password,
  };
}
