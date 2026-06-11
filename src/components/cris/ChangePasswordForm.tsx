"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, ShieldCheck } from "lucide-react";
import { changeOwnPassword } from "@/lib/actions/account";

const inputCls =
  "h-12 w-full rounded-xl border border-[var(--border)] bg-[var(--panel-solid)] px-3.5 pr-11 text-sm text-[var(--text)] outline-none focus:border-[var(--brand-amber)] focus:ring-4 focus:ring-[color-mix(in_oklab,var(--brand-amber)_18%,transparent)]";
const labelCls = "text-xs font-bold text-[var(--text-2)]";

/** Formulário de troca de senha (1º acesso ou ajuste). Redireciona ao concluir. */
export function ChangePasswordForm({ home, firstTime }: { home: string; firstTime: boolean }) {
  const router = useRouter();
  const [show, setShow] = useState(false);
  const [state, formAction, pending] = useActionState(changeOwnPassword, {});

  useEffect(() => {
    if (state.ok) {
      router.replace(home);
      router.refresh();
    }
  }, [state.ok, home, router]);

  return (
    <div className="w-full max-w-sm">
      <div className="mb-7 flex flex-col items-center text-center">
        <span className="mb-4 grid size-14 place-items-center rounded-2xl bg-[color-mix(in_oklab,var(--brand-amber)_16%,transparent)] text-[var(--brand-amber)]">
          <ShieldCheck size={26} />
        </span>
        <h1 className="display text-2xl font-semibold text-[var(--text)]">
          {firstTime ? "Defina sua senha" : "Trocar senha"}
        </h1>
        <p className="mt-2 text-sm text-[var(--text-3)]">
          {firstTime
            ? "Primeiro acesso: escolha uma senha sua para continuar."
            : "Escolha uma nova senha para sua conta."}
        </p>
      </div>

      <form action={formAction} className="space-y-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="password" className={labelCls}>
            Nova senha
          </label>
          <div className="relative">
            <input
              id="password"
              name="password"
              type={show ? "text" : "password"}
              className={inputCls}
              placeholder="ao menos 6 caracteres"
              autoComplete="new-password"
              required
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              className="absolute top-1/2 right-3 -translate-y-1/2 text-[var(--text-3)] hover:text-[var(--text)]"
              aria-label={show ? "Ocultar senha" : "Mostrar senha"}
            >
              {show ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="confirm" className={labelCls}>
            Confirmar senha
          </label>
          <div className="relative">
            <input
              id="confirm"
              name="confirm"
              type={show ? "text" : "password"}
              className={inputCls}
              placeholder="repita a nova senha"
              autoComplete="new-password"
              required
            />
          </div>
        </div>

        {state.error && (
          <div className="rounded-xl border border-[color-mix(in_oklab,var(--crit)_30%,transparent)] bg-[color-mix(in_oklab,var(--crit)_12%,transparent)] px-3 py-2 text-sm font-semibold text-[var(--crit)]">
            {state.error}
          </div>
        )}

        <button type="submit" className="cbtn primary h-12 w-full" disabled={pending}>
          {pending ? "Salvando…" : "Salvar e continuar"}
        </button>
      </form>
    </div>
  );
}
