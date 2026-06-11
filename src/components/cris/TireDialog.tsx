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
import { saveTire } from "@/lib/actions/tires";

export type TireInitial = {
  id: string;
  fireNumber: string;
  brand: string | null;
  model: string | null;
  size: string;
  treadNewMm: number | null;
  purchaseDate?: string | null;
  purchaseValue?: number | null;
  notes?: string | null;
};

const SIZES = ["275/80 R22.5", "295/80 R22.5", "275/70 R22.5", "215/75 R17.5"];

const field = "flex flex-col gap-1.5";
const labelCls = "text-xs font-bold text-[var(--text-2)]";
const inputCls =
  "h-11 rounded-xl border border-[var(--border)] bg-[var(--panel-solid)] px-3 text-sm text-[var(--text)] outline-none focus:border-[var(--brand-amber)] focus:ring-4 focus:ring-[color-mix(in_oklab,var(--brand-amber)_18%,transparent)]";

/** Dialog para cadastrar ou editar um pneu (entra no estoque). */
export function TireDialog({ trigger, initial }: { trigger: ReactElement; initial?: TireInitial }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(saveTire, {});
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
          <DialogTitle>{isEdit ? `Editar pneu ${initial.fireNumber}` : "Novo pneu"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "O nº de fogo é a identidade física do pneu."
              : "Pneu novo entra no estoque; instale pelo desenho do rodado do veículo."}
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="space-y-4">
          {initial?.id && <input type="hidden" name="id" value={initial.id} />}

          <div className="grid grid-cols-2 gap-3">
            <div className={field}>
              <label htmlFor="t-fogo" className={labelCls}>
                Nº de fogo
              </label>
              <input
                id="t-fogo"
                name="fireNumber"
                defaultValue={initial?.fireNumber ?? ""}
                className={inputCls + " mono"}
                placeholder="ex.: 175"
                required
              />
            </div>
            <div className={field}>
              <label htmlFor="t-size" className={labelCls}>
                Medida
              </label>
              <input
                id="t-size"
                name="size"
                defaultValue={initial?.size ?? ""}
                className={inputCls + " mono"}
                placeholder="295/80 R22.5"
                list="tire-sizes"
                required
              />
              <datalist id="tire-sizes">
                {SIZES.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className={field}>
              <label htmlFor="t-brand" className={labelCls}>
                Marca
              </label>
              <input
                id="t-brand"
                name="brand"
                defaultValue={initial?.brand ?? ""}
                className={inputCls}
                placeholder="ex.: Michelin"
              />
            </div>
            <div className={field}>
              <label htmlFor="t-model" className={labelCls}>
                Modelo
              </label>
              <input
                id="t-model"
                name="model"
                defaultValue={initial?.model ?? ""}
                className={inputCls}
                placeholder="ex.: X Multi Z"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className={field}>
              <label htmlFor="t-tread" className={labelCls}>
                Sulco novo (mm)
              </label>
              <input
                id="t-tread"
                name="treadNewMm"
                inputMode="decimal"
                defaultValue={initial?.treadNewMm != null ? String(initial.treadNewMm) : ""}
                className={inputCls}
                placeholder="ex.: 16"
              />
            </div>
            <div className={field}>
              <label htmlFor="t-pdate" className={labelCls}>
                Compra
              </label>
              <input
                id="t-pdate"
                name="purchaseDate"
                type="date"
                defaultValue={initial?.purchaseDate ?? ""}
                className={inputCls}
              />
            </div>
            <div className={field}>
              <label htmlFor="t-pval" className={labelCls}>
                Valor (R$)
              </label>
              <input
                id="t-pval"
                name="purchaseValue"
                inputMode="decimal"
                defaultValue={initial?.purchaseValue != null ? String(initial.purchaseValue) : ""}
                className={inputCls}
                placeholder="ex.: 2450"
              />
            </div>
          </div>

          <div className={field}>
            <label htmlFor="t-notes" className={labelCls}>
              Observações (opcional)
            </label>
            <input
              id="t-notes"
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
