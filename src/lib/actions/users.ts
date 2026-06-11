"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile, cpfToEmail } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export type UserFormState = { error?: string; ok?: boolean };

const DEFAULT_PASSWORD = "mudar123";
const ROLES = ["admin", "manager", "driver"] as const;
type Role = (typeof ROLES)[number];

/** Garante que quem chama é admin. Necessário porque usamos o service role. */
async function requireAdmin() {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "admin") {
    return { error: "Apenas administradores podem gerenciar usuários." as string };
  }
  return { profile };
}

/** Cria um usuário (conta no Auth + perfil). Senha provisória padrão. */
export async function createUser(_prev: UserFormState, formData: FormData): Promise<UserFormState> {
  const gate = await requireAdmin();
  if (gate.error) return { error: gate.error };

  const cpf = String(formData.get("cpf") ?? "").replace(/\D/g, "");
  const fullName = String(formData.get("fullName") ?? "").trim();
  const role = String(formData.get("role") ?? "") as Role;
  const phone = String(formData.get("phone") ?? "").trim() || null;

  if (cpf.length !== 11) return { error: "CPF inválido — informe os 11 dígitos." };
  if (fullName.length < 3) return { error: "Informe o nome completo." };
  if (!ROLES.includes(role)) return { error: "Selecione o cargo." };

  const admin = createAdminClient();

  const { data: dup } = await admin.from("profiles").select("id").eq("cpf", cpf).maybeSingle();
  if (dup) return { error: "Já existe um usuário com este CPF." };

  const { data: created, error: authErr } = await admin.auth.admin.createUser({
    email: cpfToEmail(cpf),
    password: DEFAULT_PASSWORD,
    email_confirm: true,
  });
  if (authErr || !created?.user) {
    return { error: `Não foi possível criar a conta: ${authErr?.message ?? "erro desconhecido"}` };
  }
  const id = created.user.id;

  const { error: pErr } = await admin.from("profiles").insert({
    id,
    cpf,
    full_name: fullName,
    role,
    phone,
    must_change_password: true,
  });
  if (pErr) {
    // Desfaz a conta de Auth pra não deixar usuário órfão sem perfil.
    await admin.auth.admin.deleteUser(id);
    return { error: `Não foi possível salvar o perfil: ${pErr.message}` };
  }

  if (role === "driver") {
    await admin.from("driver_profiles").insert({ profile_id: id });
  }

  await logAudit({
    action: "create",
    entity: "user",
    entityId: id,
    detail: { name: fullName, role },
  });
  revalidatePath("/configuracoes");
  revalidatePath("/motoristas");
  return { ok: true };
}

/** Edita um usuário (nome, CPF/login, cargo, telefone, ativo). */
export async function updateUser(_prev: UserFormState, formData: FormData): Promise<UserFormState> {
  const gate = await requireAdmin();
  if (gate.error) return { error: gate.error };

  const id = String(formData.get("id") ?? "").trim();
  const cpf = String(formData.get("cpf") ?? "").replace(/\D/g, "");
  const fullName = String(formData.get("fullName") ?? "").trim();
  const role = String(formData.get("role") ?? "") as Role;
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const isActive = formData.get("isActive") === "on";

  if (!id) return { error: "Usuário inválido." };
  if (cpf.length !== 11) return { error: "CPF inválido — informe os 11 dígitos." };
  if (fullName.length < 3) return { error: "Informe o nome completo." };
  if (!ROLES.includes(role)) return { error: "Selecione o cargo." };

  // Anti-lockout: o admin não pode se rebaixar nem se desativar.
  if (id === gate.profile!.id && (role !== "admin" || !isActive)) {
    return { error: "Você não pode rebaixar ou desativar a própria conta." };
  }

  const admin = createAdminClient();

  // CPF é o login. Se mudou, garante unicidade e atualiza o e-mail de autenticação.
  const { data: current } = await admin.from("profiles").select("cpf").eq("id", id).maybeSingle();
  const cpfChanged = current?.cpf !== cpf;
  if (cpfChanged) {
    const { data: dup } = await admin
      .from("profiles")
      .select("id")
      .eq("cpf", cpf)
      .neq("id", id)
      .maybeSingle();
    if (dup) return { error: "Já existe outro usuário com este CPF." };

    const { error: authErr } = await admin.auth.admin.updateUserById(id, {
      email: cpfToEmail(cpf),
      email_confirm: true,
    });
    if (authErr) return { error: `Não foi possível atualizar o login: ${authErr.message}` };
  }

  // Se virou motorista e ainda não tem driver_profile, cria.
  if (role === "driver") {
    const { data: dp } = await admin
      .from("driver_profiles")
      .select("profile_id")
      .eq("profile_id", id)
      .maybeSingle();
    if (!dp) await admin.from("driver_profiles").insert({ profile_id: id });
  }

  const { error } = await admin
    .from("profiles")
    .update({ cpf, full_name: fullName, role, phone, is_active: isActive })
    .eq("id", id);
  if (error) {
    if (error.message.includes("profiles_cpf_key"))
      return { error: "Já existe outro usuário com este CPF." };
    return { error: `Não foi possível salvar: ${error.message}` };
  }

  await logAudit({
    action: "update",
    entity: "user",
    entityId: id,
    detail: { name: fullName, role, isActive, cpfChanged },
  });
  revalidatePath("/configuracoes");
  revalidatePath("/motoristas");
  return { ok: true };
}

/** Redefine a senha de um usuário para a provisória e força a troca. */
export async function resetUserPassword(id: string): Promise<UserFormState> {
  const gate = await requireAdmin();
  if (gate.error) return { error: gate.error };
  if (!id) return { error: "Usuário inválido." };

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(id, { password: DEFAULT_PASSWORD });
  if (error) return { error: `Não foi possível redefinir: ${error.message}` };

  await admin.from("profiles").update({ must_change_password: true }).eq("id", id);
  await logAudit({ action: "reset_password", entity: "user", entityId: id });
  revalidatePath("/configuracoes");
  return { ok: true };
}
