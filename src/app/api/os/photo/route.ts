import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";

/**
 * Visualização segura da nota original de uma OS: valida a sessão (equipe)
 * e redireciona para uma URL assinada de curta duração do Storage privado.
 */
export async function GET(req: NextRequest) {
  const profile = await getCurrentProfile();
  if (!profile || (profile.role !== "admin" && profile.role !== "manager")) {
    return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
  }

  const path = req.nextUrl.searchParams.get("path") ?? "";
  if (!path || path.includes("..")) {
    return NextResponse.json({ error: "Caminho inválido." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase.storage.from("os-photos").createSignedUrl(path, 300);
  if (error || !data?.signedUrl) {
    return NextResponse.json({ error: "Nota não encontrada no arquivo." }, { status: 404 });
  }
  return NextResponse.redirect(data.signedUrl);
}
