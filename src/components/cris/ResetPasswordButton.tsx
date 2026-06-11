"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Check } from "lucide-react";
import { resetUserPassword } from "@/lib/actions/users";

/** Botão por linha que redefine a senha do usuário para a provisória (com confirmação). */
export function ResetPasswordButton({ userId, userName }: { userId: string; userName: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(false);

  const onClick = () => {
    if (done || pending) return;
    const ok = window.confirm(
      `Redefinir a senha de ${userName} para a provisória "mudar123"? ` +
        `A pessoa será obrigada a trocar no próximo acesso.`,
    );
    if (!ok) return;
    startTransition(async () => {
      const res = await resetUserPassword(userId);
      if (res.error) {
        window.alert(res.error);
        return;
      }
      setDone(true);
      router.refresh();
      setTimeout(() => setDone(false), 2500);
    });
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className="d-mini-btn"
      title="Redefinir senha"
    >
      {done ? <Check size={15} className="text-[var(--ok)]" /> : <KeyRound size={15} />}
    </button>
  );
}
