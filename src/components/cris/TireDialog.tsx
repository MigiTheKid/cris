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
import { DEFAULT_TIRE_CATALOG, type TireCatalog } from "@/lib/tires";

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

const field = "flex flex-col gap-1.5";
const labelCls = "text-xs font-bold text-[var(--text-2)]";
const inputCls =
  "h-11 rounded-xl border border-[var(--border)] bg-[var(--panel-solid)] px-3 text-sm text-[var(--text)] outline-none focus:border-[var(--brand-amber)] focus:ring-4 focus:ring-[color-mix(in_oklab,var(--brand-amber)_18%,transparent)]";

const ci = (s: string) => s.trim().toLocaleLowerCase("pt-BR");

/** Dialog para cadastrar ou editar um pneu (entra no estoque). */
export function TireDialog({
  trigger,
  initial,
  catalog = DEFAULT_TIRE_CATALOG,
}: {
  trigger: ReactElement;
  initial?: TireInitial;
  catalog?: TireCatalog;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(saveTire, {});
  const isEdit = !!initial?.id;

  // Seleções controladas — o modelo é filtrado pela marca.
  const [brand, setBrand] = useState(initial?.brand ?? "");
  const [model, setModel] = useState(initial?.model ?? "");
  const [size, setSize] = useState(initial?.size ?? "");

  // Listas de opções: catálogo + o valor atual do pneu (caso tenha saído do catálogo).
  // Cálculo direto — o React Compiler memoiza sozinho.
  const brandOptions = [...catalog.brands];
  if (initial?.brand && !brandOptions.some((b) => ci(b) === ci(initial.brand!)))
    brandOptions.push(initial.brand);

  const sizeOptions = [...catalog.sizes];
  if (initial?.size && !sizeOptions.some((s) => ci(s) === ci(initial.size)))
    sizeOptions.push(initial.size);

  const modelOptions = catalog.models.filter((m) => ci(m.brand) === ci(brand)).map((m) => m.name);
  if (
    initial?.model &&
    ci(initial.brand ?? "") === ci(brand) &&
    !modelOptions.some((m) => ci(m) === ci(initial.model!))
  )
    modelOptions.push(initial.model);

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setBrand(initial?.brand ?? "");
      setModel(initial?.model ?? "");
      setSize(initial?.size ?? "");
    }
  }, [open, initial]);

  useEffect(() => {
    if (state.ok) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOpen(false);
      router.refresh();
    }
  }, [state.ok, router]);

  // Trocou a marca → zera modelo que não pertence mais a ela.
  function onBrandChange(v: string) {
    setBrand(v);
    if (model && !catalog.models.some((m) => ci(m.brand) === ci(v) && ci(m.name) === ci(model))) {
      setModel("");
    }
  }

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

          <div className="grid grid-cols-2 gap-3">
            <div className={field}>
              <label htmlFor="t-brand" className={labelCls}>
                Marca
              </label>
              <select
                id="t-brand"
                name="brand"
                value={brand}
                onChange={(e) => onBrandChange(e.target.value)}
                className={inputCls}
              >
                <option value="">— selecione —</option>
                {brandOptions.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>
            <div className={field}>
              <label htmlFor="t-model" className={labelCls}>
                Modelo
              </label>
              <select
                id="t-model"
                name="model"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className={inputCls}
                disabled={!brand || modelOptions.length === 0}
              >
                <option value="">{!brand ? "escolha a marca" : "— opcional —"}</option>
                {modelOptions.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className={field}>
            <label htmlFor="t-size" className={labelCls}>
              Medida
            </label>
            <select
              id="t-size"
              name="size"
              value={size}
              onChange={(e) => setSize(e.target.value)}
              className={inputCls + " mono"}
              required
            >
              <option value="">— selecione —</option>
              {sizeOptions.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
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
