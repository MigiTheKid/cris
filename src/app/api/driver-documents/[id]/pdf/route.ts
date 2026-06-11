import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Abre o PDF de um documento de motorista (RLS decide o acesso → URL assinada). */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const { data: doc } = await supabase
    .from("driver_documents")
    .select("file_path")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (!doc) return NextResponse.json({ error: "Documento não encontrado." }, { status: 404 });
  if (!doc.file_path)
    return NextResponse.json({ error: "Documento sem PDF anexado." }, { status: 404 });

  const { data: signed, error } = await supabase.storage
    .from("documents")
    .createSignedUrl(doc.file_path, 60);

  if (error || !signed)
    return NextResponse.json({ error: "Não foi possível gerar o link." }, { status: 500 });

  return NextResponse.redirect(signed.signedUrl);
}
