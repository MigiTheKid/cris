"use client";

import { useActionState, useEffect, useState, type ReactElement } from "react";
import { useRouter } from "next/navigation";
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
import { saveCompany } from "@/lib/actions/companies";

export type CompanyInitial = {
  id: string;
  kindLabel: string;
  legalName: string;
  cnpj: string | null;
  address: string | null;
};

const field = "flex flex-col gap-1.5";
const labelCls = "text-xs font-bold text-[var(--text-2)]";
const inputCls =
  "h-11 rounded-xl border border-[var(--border)] bg-[var(--panel-solid)] px-3 text-sm text-[var(--text)] outline-none focus:border-[var(--brand-amber)] focus:ring-4 focus:ring-[color-mix(in_oklab,var(--brand-amber)_18%,transparent)]";

/** Dialog para editar os dados cadastrais de uma empresa. */
export function CompanyDialog({
  trigger,
  initial,
}: {
  trigger: ReactElement;
  initial: CompanyInitial;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(saveCompany, {});

  useEffect(() => {
    if (state.ok) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOpen(false);
      router.refresh();
    }
  }, [state.ok, router]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar {initial.kindLabel}</DialogTitle>
          <DialogDescription>Dados cadastrais usados nos documentos da empresa.</DialogDescription>
        </DialogHeader>

        <form action={formAction} className="space-y-4">
          <input type="hidden" name="id" value={initial.id} />

          <div className={field}>
            <label htmlFor="c-name" className={labelCls}>
              Razão social
            </label>
            <input
              id="c-name"
              name="legalName"
              defaultValue={initial.legalName}
              className={inputCls}
              required
            />
          </div>

          <div className={field}>
            <label htmlFor="c-cnpj" className={labelCls}>
              CNPJ (opcional)
            </label>
            <input
              id="c-cnpj"
              name="cnpj"
              defaultValue={initial.cnpj ?? ""}
              className={inputCls}
              placeholder="00.000.000/0000-00"
            />
          </div>

          <div className={field}>
            <label htmlFor="c-addr" className={labelCls}>
              Endereço (opcional)
            </label>
            <input
              id="c-addr"
              name="address"
              defaultValue={initial.address ?? ""}
              className={inputCls}
              placeholder="rua, número, cidade/UF"
            />
          </div>

          {state.error && (
            <div className="rounded-xl border border-[color-mix(in_oklab,var(--crit)_30%,transparent)] bg-[color-mix(in_oklab,var(--crit)_12%,transparent)] px-3 py-2 text-sm font-semibold text-[var(--crit)]">
              {state.error}
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
            <button type="submit" className="cbtn primary" disabled={pending}>
              {pending ? "Salvando…" : "Salvar"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
