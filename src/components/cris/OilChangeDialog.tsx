"use client";

import { useActionState, useEffect, useState, type ReactElement } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
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
import type { OilCostItem } from "@/lib/data/oil-changes";
import type { Vendor } from "@/lib/data/vendors";

export type OilChangeInitial = {
  id: string;
  changedAt: string | null;
  odometerKm: number;
  nextKm: number | null;
  oilSpec: string | null;
  vendorId: string | null;
  notes: string | null;
  items: OilCostItem[];
};

const UNITS = ["un", "L", "kg", "h"];

/** Insumos padrão sugeridos (label + unidade típica). O usuário preenche qtd/valor. */
const DEFAULT_INSUMOS: { label: string; unit: string }[] = [
  { label: "Óleo lubrificante", unit: "L" },
  { label: "Filtro de óleo", unit: "un" },
  { label: "Filtro de combustível", unit: "un" },
  { label: "Filtro de ar", unit: "un" },
  { label: "Desumidificador", unit: "un" },
  { label: "Graxa e fluidos auxiliares", unit: "kg" },
];

const field = "flex flex-col gap-1.5";
const labelCls = "text-xs font-bold text-[var(--text-2)]";
const sectionCls = "text-xs font-bold tracking-[0.08em] text-[var(--text-2)] uppercase";
const inputCls =
  "h-11 rounded-xl border border-[var(--border)] bg-[var(--panel-solid)] px-3 text-sm text-[var(--text)] outline-none focus:border-[var(--brand-amber)] focus:ring-4 focus:ring-[color-mix(in_oklab,var(--brand-amber)_18%,transparent)]";
const cellCls =
  "h-9 rounded-lg border border-[var(--border)] bg-[var(--panel-solid)] text-sm text-[var(--text)] outline-none focus:border-[var(--brand-amber)]";

const kmInt = (s: string): number | null => {
  const d = s.replace(/\D/g, "");
  return d ? Number(d) : null;
};
const num = (s: string): number => {
  const v = Number(String(s).replace(/\./g, "").replace(",", "."));
  return Number.isFinite(v) ? v : 0;
};
const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

type Row = { label: string; qty: string; unit: string; cost: string; fixed: boolean };

const fmtNum = (n: number | null | undefined) => (n == null ? "" : String(n).replace(".", ","));

function rowFromItem(it: OilCostItem, fixed: boolean, fallbackUnit: string): Row {
  return {
    label: it.label,
    qty: fmtNum(it.quantity),
    unit: it.unit ?? fallbackUnit,
    cost: fmtNum(it.cost),
    fixed,
  };
}

function initInsumos(initial?: OilChangeInitial): Row[] {
  const saved = (initial?.items ?? []).filter((i) => i.category === "insumo");
  const byLabel = new Map(saved.map((i) => [i.label, i]));
  const rows: Row[] = DEFAULT_INSUMOS.map((d) => {
    const it = byLabel.get(d.label);
    return it
      ? rowFromItem(it, true, d.unit)
      : { label: d.label, qty: "", unit: d.unit, cost: "", fixed: true };
  });
  for (const it of saved) {
    if (!DEFAULT_INSUMOS.some((d) => d.label === it.label)) rows.push(rowFromItem(it, false, "un"));
  }
  return rows;
}
function initLabor(initial?: OilChangeInitial): Row[] {
  const saved = (initial?.items ?? []).filter((i) => i.category === "mao_de_obra");
  if (saved.length === 0)
    return [{ label: "Mão de obra", qty: "", unit: "h", cost: "", fixed: true }];
  return saved.map((it, i) => rowFromItem(it, i === 0, "h"));
}

/** Registra ou edita uma troca de óleo: intervalo auto + custos itemizados (qtd/un). */
export function OilChangeDialog({
  vehicleId,
  vendors,
  trigger,
  initial,
}: {
  vehicleId: string;
  vendors: Vendor[];
  trigger: ReactElement;
  initial?: OilChangeInitial;
}) {
  // Oficinas que fazem troca de óleo (+ a já selecionada, mesmo se inativa).
  const oilVendors = vendors.filter(
    (v) => v.isActive && (v.kind === "troca_oleo" || v.kind === "ambos"),
  );
  if (initial?.vendorId && !oilVendors.some((v) => v.id === initial.vendorId)) {
    const sel = vendors.find((v) => v.id === initial.vendorId);
    if (sel) oilVendors.push(sel);
  }
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(saveOilChange, {});
  const isEdit = !!initial?.id;

  const [odo, setOdo] = useState(initial ? String(initial.odometerKm) : "");
  const [next, setNext] = useState(initial?.nextKm != null ? String(initial.nextKm) : "");
  const [itv, setItv] = useState(
    initial && initial.nextKm != null ? String(initial.nextKm - initial.odometerKm) : "",
  );
  const [insumos, setInsumos] = useState<Row[]>(() => initInsumos(initial));
  const [labor, setLabor] = useState<Row[]>(() => initLabor(initial));

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOdo(initial ? String(initial.odometerKm) : "");
      setNext(initial?.nextKm != null ? String(initial.nextKm) : "");
      setItv(initial && initial.nextKm != null ? String(initial.nextKm - initial.odometerKm) : "");
      setInsumos(initInsumos(initial));
      setLabor(initLabor(initial));
    }
  }, [open, initial]);

  useEffect(() => {
    if (state.ok) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOpen(false);
      router.refresh();
    }
  }, [state.ok, router]);

  function onOdo(v: string) {
    setOdo(v);
    const o = kmInt(v);
    if (o == null) return;
    const i = kmInt(itv);
    const n = kmInt(next);
    if (i != null) setNext(String(o + i));
    else if (n != null) setItv(String(n - o));
  }
  function onNext(v: string) {
    setNext(v);
    const n = kmInt(v),
      o = kmInt(odo);
    if (n != null && o != null) setItv(String(n - o));
  }
  function onItv(v: string) {
    setItv(v);
    const i = kmInt(v),
      o = kmInt(odo);
    if (i != null && o != null) setNext(String(o + i));
  }

  const total = [...insumos, ...labor].reduce((s, r) => s + num(r.cost), 0);

  const itemsPayload = JSON.stringify(
    [
      ...insumos.map((r) => ({ ...r, category: "insumo" })),
      ...labor.map((r) => ({ ...r, category: "mao_de_obra" })),
    ]
      .filter((r) => r.label.trim() && num(r.cost) > 0)
      .map((r) => ({
        category: r.category,
        label: r.label.trim(),
        quantity: num(r.qty) > 0 ? num(r.qty) : null,
        unit: r.unit,
        cost: num(r.cost),
      })),
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar troca de óleo" : "Registrar troca de óleo"}</DialogTitle>
          <DialogDescription>
            Controle por km. Preencha a próxima troca <b>ou</b> o intervalo — o outro é calculado.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="space-y-4">
          <input type="hidden" name="vehicleId" value={vehicleId} />
          {initial?.id && <input type="hidden" name="id" value={initial.id} />}
          <input type="hidden" name="odometerKm" value={odo} />
          <input type="hidden" name="nextKm" value={next} />
          <input type="hidden" name="items" value={itemsPayload} />

          <div className="grid grid-cols-3 gap-3">
            <div className={field}>
              <label className={labelCls}>Km da troca</label>
              <input
                inputMode="numeric"
                value={odo}
                onChange={(e) => onOdo(e.target.value)}
                className={inputCls + " mono"}
                placeholder="412747"
                required
              />
            </div>
            <div className={field}>
              <label className={labelCls}>Próxima troca</label>
              <input
                inputMode="numeric"
                value={next}
                onChange={(e) => onNext(e.target.value)}
                className={inputCls + " mono"}
                placeholder="447747"
              />
            </div>
            <div className={field}>
              <label className={labelCls}>Intervalo (km)</label>
              <input
                inputMode="numeric"
                value={itv}
                onChange={(e) => onItv(e.target.value)}
                className={inputCls + " mono"}
                placeholder="35000"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className={field}>
              <label className={labelCls}>Data (opcional)</label>
              <input
                name="changedAt"
                type="date"
                defaultValue={initial?.changedAt ?? ""}
                className={inputCls}
              />
            </div>
            <div className={field}>
              <label className={labelCls}>Óleo</label>
              <input
                name="oilSpec"
                defaultValue={initial?.oilSpec ?? ""}
                className={inputCls}
                placeholder="ex.: 15W40"
              />
            </div>
          </div>

          {/* --- Insumos --- */}
          <CostSection
            title="Insumos"
            rows={insumos}
            setRows={setInsumos}
            addLabel="Adicionar insumo"
          />

          {/* --- Mão de obra --- */}
          <CostSection
            title="Mão de obra"
            rows={labor}
            setRows={setLabor}
            addLabel="Adicionar serviço"
          />

          <div className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--panel-solid)] px-4 py-2.5">
            <span className="text-[11px] font-bold tracking-[0.1em] text-[var(--text-3)] uppercase">
              Total
            </span>
            <span className="mono text-lg font-bold text-[var(--text)]">{brl(total)}</span>
          </div>

          <div className={field}>
            <label className={labelCls}>Oficina (opcional)</label>
            <select name="vendorId" defaultValue={initial?.vendorId ?? ""} className={inputCls}>
              <option value="">— nenhuma —</option>
              {oilVendors.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </div>

          <div className={field}>
            <label className={labelCls}>Observações (opcional)</label>
            <input name="notes" defaultValue={initial?.notes ?? ""} className={inputCls} />
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

/** Seção de custos (insumos OU mão de obra): linhas com nome, qtd, unidade e valor. */
function CostSection({
  title,
  rows,
  setRows,
  addLabel,
}: {
  title: string;
  rows: Row[];
  setRows: React.Dispatch<React.SetStateAction<Row[]>>;
  addLabel: string;
}) {
  const patch = (i: number, p: Partial<Row>) =>
    setRows((rs) => rs.map((r, x) => (x === i ? { ...r, ...p } : r)));
  const remove = (i: number) => setRows((rs) => rs.filter((_, x) => x !== i));
  const add = () =>
    setRows((rs) => [...rs, { label: "", qty: "", unit: "un", cost: "", fixed: false }]);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className={sectionCls}>{title}</span>
        <div className="flex gap-1 pr-7 text-[10px] font-bold text-[var(--text-3)] uppercase">
          <span className="w-14 text-center">Qtd</span>
          <span className="w-12 text-center">Un.</span>
          <span className="w-20 text-center">R$</span>
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        {rows.map((r, i) => (
          <div key={i} className="flex items-center gap-1">
            {r.fixed ? (
              <span className="min-w-0 flex-1 truncate text-sm text-[var(--text-2)]">
                {r.label}
              </span>
            ) : (
              <input
                value={r.label}
                onChange={(e) => patch(i, { label: e.target.value })}
                className={cellCls + " min-w-0 flex-1 px-2.5"}
                placeholder="nome"
              />
            )}
            <input
              inputMode="decimal"
              value={r.qty}
              onChange={(e) => patch(i, { qty: e.target.value })}
              className={cellCls + " mono w-14 px-2 text-right"}
              placeholder="0"
            />
            <select
              value={r.unit}
              onChange={(e) => patch(i, { unit: e.target.value })}
              className={cellCls + " w-12 px-1"}
            >
              {UNITS.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
            <input
              inputMode="decimal"
              value={r.cost}
              onChange={(e) => patch(i, { cost: e.target.value })}
              className={cellCls + " mono w-20 px-2 text-right"}
              placeholder="0,00"
            />
            {r.fixed ? (
              <span className="w-6" />
            ) : (
              <button
                type="button"
                onClick={() => remove(i)}
                className="grid size-6 place-items-center rounded-md text-[var(--text-3)] hover:text-[var(--crit)]"
                aria-label="Remover"
              >
                <X size={14} />
              </button>
            )}
          </div>
        ))}
      </div>
      <button type="button" onClick={add} className="cbtn ghost px-3" style={{ height: 32 }}>
        <Plus size={14} /> {addLabel}
      </button>
    </div>
  );
}
