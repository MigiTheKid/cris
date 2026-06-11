import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { signOut } from "@/lib/actions/auth";
import { CrisMark } from "@/components/cris/CrisMark";
import { ChangePasswordForm } from "@/components/cris/ChangePasswordForm";

export const dynamic = "force-dynamic";

/** Tela de troca de senha — destino do gate `must_change_password`. */
export default async function TrocarSenhaPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const home = profile.role === "driver" ? "/motorista" : "/painel";

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 bg-[var(--bg)] p-6">
      <CrisMark size={48} />
      <ChangePasswordForm home={home} firstTime={profile.mustChangePassword} />
      <form action={signOut}>
        <button
          type="submit"
          className="text-sm font-semibold text-[var(--text-3)] hover:text-[var(--text)]"
        >
          Sair
        </button>
      </form>
    </main>
  );
}
