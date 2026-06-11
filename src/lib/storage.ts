import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

/** URL assinada (curta) para exibir uma foto do bucket privado `photos`. */
export async function signedPhotoUrl(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, any, any>,
  path: string | null,
): Promise<string | null> {
  if (!path) return null;
  const { data } = await supabase.storage.from("photos").createSignedUrl(path, 300);
  return data?.signedUrl ?? null;
}
