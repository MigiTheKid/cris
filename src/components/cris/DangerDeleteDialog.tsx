"use client";

import { useState, useTransition, type ReactElement } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

/**
 * Exclusão com dupla verificação: abrir o diálogo (intenção) + digitar o
 * identificador exato (placa/nome) para liberar o botão. A ação é um soft
 * delete reversível — o texto deixa isso claro.
 */
export function DangerDeleteDialog({
  trigger,
  title,
  description,
  confirmWord,
  consequences,
  action,
  redirectTo,
}: {
  trigger: ReactElement;
  title: string;
  description: string;
  /** Texto que o usuário precisa digitar exatamente para confirmar. */
  confirmWord: string;
  consequences?: string[];
  action: () => Promise<{ error?: string; ok?: boolean }>;
  /** Para onde ir após excluir (ex.: a lista). Sem isso, só dá refresh. */
  redirectTo?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const match = typed.trim().toLocaleUpperCase() === confirmWord.trim().toLocaleUpperCase();

  function submit() {
    if (!match || pending) return;
    setErr(null);
    start(async () => {
      const res = await action();
      if (res?.error) {
        setErr(res.error);
        return;
      }
      setOpen(false);
      if (redirectTo) router.push(redirectTo);
      else router.refresh();
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) {
          setTyped("");
          setErr(null);
        }
      }}
    >
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            <span className="inline-flex items-center gap-2 text-[var(--crit)]">
              <AlertTriangle size={18} /> {title}
            </span>
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {consequences && consequences.length > 0 && (
            <ul className="flex flex-col gap-1.5 rounded-xl border border-[color-mix(in_oklab,var(--crit)_25%,transparent)] bg-[color-mix(in_oklab,var(--crit)_8%,transparent)] px-4 py-3 text-sm text-[var(--text-2)]">
              {consequences.map((c, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-[var(--crit)]">•</span> {c}
                </li>
              ))}
            </ul>
          )}

          <div className="flex flex-col gap-1.5">
            <label htmlFor="danger-confirm" className="text-xs font-bold text-[var(--text-2)]">
              Para confirmar, digite{" "}
              <span className="mono font-bold text-[var(--text)]">{confirmWord}</span>
            </label>
            <input
              id="danger-confirm"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  submit();
                }
              }}
              autoComplete="off"
              className="mono h-11 rounded-xl border border-[var(--border)] bg-[var(--panel-solid)] px-3 text-sm text-[var(--text)] outline-none focus:border-[var(--crit)] focus:ring-4 focus:ring-[color-mix(in_oklab,var(--crit)_18%,transparent)]"
              placeholder={confirmWord}
            />
          </div>

          {err && (
            <div className="rounded-xl border border-[color-mix(in_oklab,var(--crit)_30%,transparent)] bg-[color-mix(in_oklab,var(--crit)_12%,transparent)] px-3 py-2 text-sm font-semibold text-[var(--crit)]">
              {err}
            </div>
          )}

          <DialogFooter>
            <DialogClose
              render={
                <button type="button" className="cbtn ghost">
                  Cancelar
                </button>
              }
            />
            <button
              type="button"
              onClick={submit}
              disabled={!match || pending}
              className="cbtn"
              style={{
                background: match
                  ? "var(--crit)"
                  : "color-mix(in oklab, var(--crit) 40%, transparent)",
                color: "#fff",
                cursor: match && !pending ? "pointer" : "not-allowed",
              }}
            >
              {pending ? "Excluindo…" : "Excluir"}
            </button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
