"use server";

import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";

export type PasswordState = { error?: string; ok?: boolean };

/**
 * Troca a senha do próprio usuário autenticado e baixa a flag
 * `must_change_password`. Usado na tela de primeiro acesso e em ajustes de conta.
 */
export async function changeOwnPassword(
  _prev: PasswordState,
  formData: FormData,
): Promise<PasswordState> {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (password.length < 6) return { error: "A senha precisa de ao menos 6 caracteres." };
  if (password !== confirm) return { error: "As senhas não conferem." };
  if (password === "mudar123") return { error: "Escolha uma senha diferente da provisória." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada. Entre novamente." };

  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: `Não foi possível alterar a senha: ${error.message}` };

  const { error: pErr } = await supabase
    .from("profiles")
    .update({ must_change_password: false })
    .eq("id", user.id);
  if (pErr) return { error: `Senha alterada, mas falhou ao atualizar o perfil: ${pErr.message}` };

  await logAudit({ action: "password_change", entity: "account", entityId: user.id });
  return { ok: true };
}
