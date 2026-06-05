"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { cpfToEmail } from "@/lib/auth";

export type LoginState = { error?: string };

/** Login por CPF + senha (e-mail sintético interno). */
export async function signIn(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const cpf = String(formData.get("cpf") ?? "");
  const password = String(formData.get("password") ?? "");

  const digits = cpf.replace(/\D/g, "");
  if (digits.length !== 11) return { error: "Informe um CPF válido (11 dígitos)." };
  if (!password) return { error: "Informe sua senha." };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: cpfToEmail(cpf),
    password,
  });

  if (error || !data.user) {
    return { error: "CPF ou senha incorretos." };
  }

  // Redireciona conforme o cargo.
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .single();

  redirect(profile?.role === "driver" ? "/motorista" : "/painel");
}

/** Encerra a sessão. */
export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
