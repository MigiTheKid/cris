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
import { saveOilChange } from "@/lib/actions/oil-changes";

export type OilChangeInitial = {
  id: string;
  changedAt: string | null;
  odometerKm: number;
  nextKm: number | null;
  oilSpec: string | null;
  filterChanged: boolean;
  vendor: string | null;
  cost: number | null;
  notes: string | null;
};

const field = "flex flex-col gap-1.5";
const labelCls = "text-xs font-bold text-[var(--text-2)]";
const inputCls =
  "h-11 rounded-xl border border-[var(--border)] bg-[var(--panel-solid)] px-3 text-sm text-[var(--text)] outline-none focus:border-[var(--brand-amber)] focus:ring-4 focus:ring-[color-mix(in_oklab,var(--brand-amber)_18%,transparent)]";

/** Registra ou edita uma troca de óleo de um veículo. */
export function OilChangeDialog({
  vehicleId,
  trigger,
  initial,
}: {
  vehicleId: string;
  trigger: ReactElement;
  initial?: OilChangeInitial;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(saveOilChange, {});
  const isEdit = !!initial?.id;

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
          <DialogTitle>{isEdit ? "Editar troca de óleo" : "Registrar troca de óleo"}</DialogTitle>
          <DialogDescription>
            O controle é por km: informe o km da troca e o km da próxima.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="space-y-4">
          <input type="hidden" name="vehicleId" value={vehicleId} />
          {initial?.id && <input type="hidden" name="id" value={initial.id} />}

          <div className="grid grid-cols-2 gap-3">
            <div className={field}>
              <label htmlFor="o-km" className={labelCls}>
                Km da troca
              </label>
              <input
                id="o-km"
                name="odometerKm"
                inputMode="numeric"
                defaultValue={initial ? String(initial.odometerKm) : ""}
                className={inputCls + " mono"}
                placeholder="ex.: 412747"
                required
              />
            </div>
            <div className={field}>
              <label htmlFor="o-next" className={labelCls}>
                Próxima troca (km)
              </label>
              <input
                id="o-next"
                name="nextKm"
                inputMode="numeric"
                defaultValue={initial?.nextKm != null ? String(initial.nextKm) : ""}
                className={inputCls + " mono"}
                placeholder="ex.: 447747"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className={field}>
              <label htmlFor="o-date" className={labelCls}>
                Data (opcional)
              </label>
              <input
                id="o-date"
                name="changedAt"
                type="date"
                defaultValue={initial?.changedAt ?? ""}
                className={inputCls}
              />
            </div>
            <div className={field}>
              <label htmlFor="o-oil" className={labelCls}>
                Óleo
              </label>
              <input
                id="o-oil"
                name="oilSpec"
                defaultValue={initial?.oilSpec ?? ""}
                className={inputCls}
                placeholder="ex.: 15W40"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className={field}>
              <label htmlFor="o-vendor" className={labelCls}>
                Oficina (opcional)
              </label>
              <input
                id="o-vendor"
                name="vendor"
                defaultValue={initial?.vendor ?? ""}
                className={inputCls}
                placeholder="ex.: oficina X"
              />
            </div>
            <div className={field}>
              <label htmlFor="o-cost" className={labelCls}>
                Custo (R$)
              </label>
              <input
                id="o-cost"
                name="cost"
                inputMode="decimal"
                defaultValue={initial?.cost != null ? String(initial.cost) : ""}
                className={inputCls + " mono"}
                placeholder="ex.: 850"
              />
            </div>
          </div>

          <label className="flex items-center gap-2.5 rounded-xl border border-[var(--border)] px-3 py-2.5">
            <input
              type="checkbox"
              name="filterChanged"
              defaultChecked={initial?.filterChanged ?? true}
              className="size-4 accent-[var(--brand-amber)]"
            />
            <span className="text-sm font-semibold text-[var(--text)]">Trocou o filtro</span>
          </label>

          <div className={field}>
            <label htmlFor="o-notes" className={labelCls}>
              Observações (opcional)
            </label>
            <input
              id="o-notes"
              name="notes"
              defaultValue={initial?.notes ?? ""}
              className={inputCls}
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
