"use client";

import { useActionState, useEffect, useState, type ReactElement } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Check } from "lucide-react";
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
import { saveAxleLayout, installTire, removeTire, recordReading } from "@/lib/actions/tires";
import {
  AXLE_PRESETS,
  AXLE_KIND_LABEL,
  DEFAULT_TIRE_THRESHOLDS,
  type AxleKind,
  type TireThresholds,
} from "@/lib/tires";
import type { StockTire } from "@/lib/data/tires";

const field = "flex flex-col gap-1.5";
const labelCls = "text-xs font-bold text-[var(--text-2)]";
const inputCls =
  "h-11 rounded-xl border border-[var(--border)] bg-[var(--panel-solid)] px-3 text-sm text-[var(--text)] outline-none focus:border-[var(--brand-amber)] focus:ring-4 focus:ring-[color-mix(in_oklab,var(--brand-amber)_18%,transparent)]";
const errBox =
  "rounded-xl border border-[color-mix(in_oklab,var(--crit)_30%,transparent)] bg-[color-mix(in_oklab,var(--crit)_12%,transparent)] px-3 py-2 text-sm font-semibold text-[var(--crit)]";

function useCloseOnOk(ok: boolean | undefined, setOpen: (v: boolean) => void) {
  const router = useRouter();
  useEffect(() => {
    if (ok) {
      setOpen(false);
      router.refresh();
    }
  }, [ok, router, setOpen]);
}

/* ---------------- Layout de eixos ---------------- */

type AxleRow = { kind: AxleKind; dual: boolean };

export function AxleLayoutDialog({
  vehicleId,
  vehicleType,
  initial,
  trigger,
}: {
  vehicleId: string;
  vehicleType: string;
  initial: AxleRow[];
  trigger: ReactElement;
}) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<AxleRow[]>([]);
  const [state, formAction, pending] = useActionState(saveAxleLayout, {});
  useCloseOnOk(state.ok, setOpen);

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRows(initial.length > 0 ? initial : (AXLE_PRESETS[vehicleType] ?? []));
    }
  }, [open, initial, vehicleType]);

  const serialized = rows.map((r) => `${r.kind}:${r.dual ? "1" : "0"}`).join(",");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Layout de eixos</DialogTitle>
          <DialogDescription>
            Define o desenho do rodado. Eixo 1 é o mais à frente; rodado duplo tem 4 pneus.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="space-y-4">
          <input type="hidden" name="vehicleId" value={vehicleId} />
          <input type="hidden" name="axles" value={serialized} />

          <div className="flex flex-col gap-2">
            {rows.map((r, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="mono w-12 text-xs font-bold text-[var(--text-3)]">
                  Eixo {i + 1}
                </span>
                <select
                  value={r.kind}
                  onChange={(e) =>
                    setRows(
                      rows.map((x, j) =>
                        j === i ? { ...x, kind: e.target.value as AxleKind } : x,
                      ),
                    )
                  }
                  className={inputCls + " h-10 flex-1"}
                >
                  {Object.entries(AXLE_KIND_LABEL).map(([k, label]) => (
                    <option key={k} value={k}>
                      {label}
                    </option>
                  ))}
                </select>
                <label className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-2)]">
                  <input
                    type="checkbox"
                    checked={r.dual}
                    onChange={(e) =>
                      setRows(rows.map((x, j) => (j === i ? { ...x, dual: e.target.checked } : x)))
                    }
                    className="size-4 accent-[var(--brand-amber)]"
                  />
                  Duplo
                </label>
                <button
                  type="button"
                  onClick={() => setRows(rows.filter((_, j) => j !== i))}
                  className="d-mini-btn danger"
                  title="Remover eixo"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            {rows.length < 6 && (
              <button
                type="button"
                onClick={() => setRows([...rows, { kind: "reboque", dual: true }])}
                className="cbtn ghost"
                style={{ height: 38 }}
              >
                <Plus size={15} /> Adicionar eixo
              </button>
            )}
          </div>

          {state.error && <div className={errBox}>{state.error}</div>}

          <DialogFooter>
            <DialogClose
              render={
                <button type="button" className="cbtn ghost">
                  Cancelar
                </button>
              }
            />
            <button type="submit" className="cbtn primary" disabled={pending || rows.length === 0}>
              {pending ? "Salvando…" : "Salvar layout"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ---------------- Instalar pneu ---------------- */

export function InstallTireDialog({
  open,
  onOpenChange,
  vehicleId,
  positionLabel,
  axleNumber,
  side,
  dualPos,
  stock,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  vehicleId: string;
  positionLabel: string;
  axleNumber: number;
  side: string;
  dualPos: string | null;
  stock: StockTire[];
}) {
  const [selected, setSelected] = useState("");
  const [state, formAction, pending] = useActionState(installTire, {});
  useCloseOnOk(state.ok, onOpenChange);

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelected("");
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Instalar pneu</DialogTitle>
          <DialogDescription>
            Posição: <strong>{positionLabel}</strong>. Escolha um pneu do estoque.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="space-y-4">
          <input type="hidden" name="vehicleId" value={vehicleId} />
          <input type="hidden" name="axleNumber" value={axleNumber} />
          <input type="hidden" name="side" value={side} />
          <input type="hidden" name="dualPos" value={dualPos ?? ""} />
          <input type="hidden" name="tireId" value={selected} />

          <div className="flex max-h-[40vh] flex-col gap-1.5 overflow-y-auto pr-1">
            {stock.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setSelected(t.id)}
                className={
                  selected === t.id
                    ? "flex items-center gap-3 rounded-xl border border-[var(--brand-amber)] bg-[color-mix(in_oklab,var(--brand-amber)_10%,transparent)] px-3 py-2.5 text-left"
                    : "flex items-center gap-3 rounded-xl border border-[var(--border)] px-3 py-2.5 text-left hover:bg-[var(--hover)]"
                }
              >
                <span className="mono grid size-10 place-items-center rounded-full bg-[var(--panel-solid)] text-sm font-bold text-[var(--text)]">
                  {t.fireNumber}
                </span>
                <span className="flex-1">
                  <span className="block text-sm font-semibold text-[var(--text)]">
                    {[t.brand, t.model].filter(Boolean).join(" ") || "Sem marca"}
                  </span>
                  <span className="mono block text-xs text-[var(--text-3)]">
                    {t.size} · vida {t.life}
                    {t.treadMm != null ? ` · sulco ${String(t.treadMm).replace(".", ",")} mm` : ""}
                  </span>
                </span>
                {selected === t.id && <Check size={18} className="text-[var(--brand-amber)]" />}
              </button>
            ))}
            {stock.length === 0 && (
              <div className="rounded-xl border border-dashed border-[var(--border)] px-4 py-6 text-center text-sm text-[var(--text-3)]">
                Nenhum pneu em estoque. Cadastre em Pneus → Novo pneu.
              </div>
            )}
          </div>

          <div className={field}>
            <label htmlFor="it-km" className={labelCls}>
              Km atual do veículo (opcional)
            </label>
            <input
              id="it-km"
              name="vehicleKm"
              inputMode="numeric"
              className={inputCls}
              placeholder="ex.: 291618"
            />
          </div>

          {state.error && <div className={errBox}>{state.error}</div>}

          <DialogFooter>
            <DialogClose
              render={
                <button type="button" className="cbtn ghost">
                  Cancelar
                </button>
              }
            />
            <button type="submit" className="cbtn primary" disabled={pending || !selected}>
              {pending ? "Instalando…" : "Instalar"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ---------------- Remover pneu ---------------- */

const DESTINATIONS = [
  { value: "estoque", label: "Estoque" },
  { value: "recapagem", label: "Recapadora" },
  { value: "conserto", label: "Conserto" },
  { value: "sucateado", label: "Sucata" },
];

export function RemoveTireDialog({
  open,
  onOpenChange,
  installationId,
  fireNumber,
  positionLabel,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  installationId: string;
  fireNumber: string;
  positionLabel: string;
}) {
  const [state, formAction, pending] = useActionState(removeTire, {});
  useCloseOnOk(state.ok, onOpenChange);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Remover pneu {fireNumber}</DialogTitle>
          <DialogDescription>
            Sai de <strong>{positionLabel}</strong>. Para onde vai?
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="space-y-4">
          <input type="hidden" name="installationId" value={installationId} />

          <div className={field}>
            <label htmlFor="rt-dest" className={labelCls}>
              Destino
            </label>
            <select id="rt-dest" name="destination" defaultValue="estoque" className={inputCls}>
              {DESTINATIONS.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>

          <div className={field}>
            <label htmlFor="rt-km" className={labelCls}>
              Km atual do veículo (opcional)
            </label>
            <input id="rt-km" name="vehicleKm" inputMode="numeric" className={inputCls} />
          </div>

          {state.error && <div className={errBox}>{state.error}</div>}

          <DialogFooter>
            <DialogClose
              render={
                <button type="button" className="cbtn ghost">
                  Cancelar
                </button>
              }
            />
            <button type="submit" className="cbtn primary" disabled={pending}>
              {pending ? "Removendo…" : "Remover"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ---------------- Aferição ---------------- */

export function ReadingDialog({
  open,
  onOpenChange,
  tireId,
  fireNumber,
  thresholds,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tireId: string;
  fireNumber: string;
  thresholds?: TireThresholds;
}) {
  const [state, formAction, pending] = useActionState(recordReading, {});
  useCloseOnOk(state.ok, onOpenChange);
  const t = thresholds ?? DEFAULT_TIRE_THRESHOLDS;
  const fmt = (n: number) => String(n).replace(".", ",");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Aferir pneu {fireNumber}</DialogTitle>
          <DialogDescription>
            Sulco em milímetros (legal: 1,6 · recape: {fmt(t.recapMm)}–{fmt(t.okMm)}).
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="space-y-4">
          <input type="hidden" name="tireId" value={tireId} />

          <div className="grid grid-cols-2 gap-3">
            <div className={field}>
              <label htmlFor="rd-tread" className={labelCls}>
                Sulco (mm)
              </label>
              <input
                id="rd-tread"
                name="treadMm"
                inputMode="decimal"
                className={inputCls}
                placeholder="ex.: 4,5"
                autoFocus
                required
              />
            </div>
            <div className={field}>
              <label htmlFor="rd-psi" className={labelCls}>
                Pressão (psi, opc.)
              </label>
              <input
                id="rd-psi"
                name="pressurePsi"
                inputMode="numeric"
                className={inputCls}
                placeholder="ex.: 110"
              />
            </div>
          </div>

          <div className={field}>
            <label htmlFor="rd-km" className={labelCls}>
              Km atual do veículo (opcional)
            </label>
            <input id="rd-km" name="vehicleKm" inputMode="numeric" className={inputCls} />
          </div>

          {state.error && <div className={errBox}>{state.error}</div>}

          <DialogFooter>
            <DialogClose
              render={
                <button type="button" className="cbtn ghost">
                  Cancelar
                </button>
              }
            />
            <button type="submit" className="cbtn primary" disabled={pending}>
              {pending ? "Salvando…" : "Registrar"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
