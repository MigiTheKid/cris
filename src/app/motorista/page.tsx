import { redirect } from "next/navigation";
import { Truck, LogOut } from "lucide-react";
import { getCurrentProfile } from "@/lib/auth";
import { signOut } from "@/lib/actions/auth";
import { CrisMark } from "@/components/cris/CrisMark";

export const dynamic = "force-dynamic";

/** Landing do App do Motorista (mobile). Placeholder honesto da M1. */
export default async function MotoristaPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[var(--bg)] p-6 text-center">
      <CrisMark size={56} />
      <div>
        <h1 className="display text-2xl font-semibold text-[var(--text)]">
          Olá, {profile.fullName.split(" ")[0]}
        </h1>
        <p className="mt-2 max-w-xs text-sm text-[var(--text-3)]">
          O App do Motorista está chegando. Em breve você verá aqui seu veículo, seus documentos e
          poderá abrir ocorrências.
        </p>
      </div>

      <div className="flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--panel-solid)] px-4 py-2 text-sm text-[var(--text-2)]">
        <Truck size={16} className="text-[var(--brand-amber)]" />
        Em construção
      </div>

      <form action={signOut}>
        <button
          type="submit"
          className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[var(--text-3)] hover:text-[var(--text)]"
        >
          <LogOut size={15} />
          Sair
        </button>
      </form>
    </main>
  );
}
