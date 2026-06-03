import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

/**
 * Cliente Supabase com service role — **somente servidor**, ignora RLS.
 * TEMPORÁRIO na M1: usado para listagens enquanto o login real não existe.
 * Quando o auth entrar, as leituras passam a usar o cliente da sessão (server.ts),
 * respeitando a RLS por cargo.
 */
export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
