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
import { saveDriverProfile } from "@/lib/actions/drivers";

export type DriverProfileInitial = {
  id: string;
  fullName: string;
  phone: string | null;
  cnhCategory: string | null;
  birthDate: string | null;
  hiredAt: string | null;
};

const field = "flex flex-col gap-1.5";
const labelCls = "text-xs font-bold text-[var(--text-2)]";
const inputCls =
  "h-11 rounded-xl border border-[var(--border)] bg-[var(--panel-solid)] px-3 text-sm text-[var(--text)] outline-none focus:border-[var(--brand-amber)] focus:ring-4 focus:ring-[color-mix(in_oklab,var(--brand-amber)_18%,transparent)]";

const CNH_CATS = ["A", "B", "AB", "C", "D", "E", "AC", "AD", "AE"];

/** Dialog para editar os dados pessoais do motorista. */
export function DriverProfileDialog({
  trigger,
  initial,
}: {
  trigger: ReactElement;
  initial: DriverProfileInitial;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(saveDriverProfile, {});

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
          <DialogTitle>Editar dados do motorista</DialogTitle>
          <DialogDescription>
            Dados pessoais e da CNH. A <strong>validade</strong> da CNH é controlada pelo documento
            CNH (na aba Documentos).
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="space-y-4">
          <input type="hidden" name="driverId" value={initial.id} />

          <div className={field}>
            <label htmlFor="d-name" className={labelCls}>
              Nome completo
            </label>
            <input
              id="d-name"
              name="fullName"
              defaultValue={initial.fullName}
              className={inputCls}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className={field}>
              <label htmlFor="d-phone" className={labelCls}>
                Telefone
              </label>
              <input
                id="d-phone"
                name="phone"
                defaultValue={initial.phone ?? ""}
                className={inputCls}
                placeholder="(00) 00000-0000"
              />
            </div>
            <div className={field}>
              <label htmlFor="d-cnh" className={labelCls}>
                Categoria CNH
              </label>
              <input
                id="d-cnh"
                name="cnhCategory"
                defaultValue={initial.cnhCategory ?? ""}
                className={inputCls}
                placeholder="ex.: AE"
                list="cnh-cats"
                maxLength={3}
              />
              <datalist id="cnh-cats">
                {CNH_CATS.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className={field}>
              <label htmlFor="d-birth" className={labelCls}>
                Nascimento
              </label>
              <input
                id="d-birth"
                name="birthDate"
                type="date"
                defaultValue={initial.birthDate ?? ""}
                className={inputCls}
              />
            </div>
            <div className={field}>
              <label htmlFor="d-hired" className={labelCls}>
                Admissão
              </label>
              <input
                id="d-hired"
                name="hiredAt"
                type="date"
                defaultValue={initial.hiredAt ?? ""}
                className={inputCls}
              />
            </div>
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
