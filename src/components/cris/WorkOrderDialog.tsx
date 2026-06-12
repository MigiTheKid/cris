"use client";

import { useActionState, useEffect, useState, type ReactElement } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, Trash2 } from "lucide-react";
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
import { saveWorkOrder } from "@/lib/actions/work-orders";
import { REASON_LABEL } from "@/lib/maintenance-labels";
import type { MaintSystem, ServiceOption, WorkOrder } from "@/lib/data/maintenance";
import type { Vendor } from "@/lib/data/vendors";

const UNITS = ["un", "jg", "par", "L", "kg", "h"];

const field = "flex flex-col gap-1.5";
const labelCls = "text-xs font-bold text-[var(--text-2)]";
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
const fmtNum = (n: number | null | undefined) => (n == null ? "" : String(n).replace(".", ","));

type CostRow = { label: string; qty: string; unit: string; cost: string };

type ItemState = {
  serviceId: string; // "" = serviço avulso (custom)
  label: string;
  systemId: string;
  description: string;
  nextKm: string;
  pecas: CostRow[];
  mo: CostRow; // mão de obra (linha fixa)
};

const emptyPeca = (): CostRow => ({ label: "", qty: "", unit: "un", cost: "" });
const emptyItem = (): ItemState => ({
  serviceId: "",
  label: "",
  systemId: "",
  description: "",
  nextKm: "",
  pecas: [emptyPeca()],
  mo: { label: "Mão de obra", qty: "", unit: "h", cost: "" },
});

function itemsFromOrder(order: WorkOrder): ItemState[] {
  return order.items.map((i) => {
    const pecas = i.costs
      .filter((c) => c.category === "peca")
      .map((c) => ({
        label: c.label,
        qty: fmtNum(c.quantity),
        unit: c.unit ?? "un",
        cost: fmtNum(c.cost),
      }));
    const moCosts = i.costs.filter((c) => c.category === "mao_de_obra");
    const moTotal = moCosts.reduce((s, c) => s + c.cost, 0);
    return {
      serviceId: i.serviceId ?? "",
      label: i.label,
      systemId: String(i.systemId),
      description: i.description ?? "",
      nextKm: i.nextKm != null ? String(i.nextKm) : "",
      pecas: pecas.length ? pecas : [emptyPeca()],
      mo: {
        label: moCosts[0]?.label ?? "Mão de obra",
        qty: fmtNum(moCosts[0]?.quantity ?? null),
        unit: moCosts[0]?.unit ?? "h",
        cost: moTotal > 0 ? fmtNum(moTotal) : "",
      },
    };
  });
}

/** Registra ou edita uma ordem de serviço (manutenção) com itens e custos. */
export function WorkOrderDialog({
  vehicleId,
  systems,
  services,
  vendors,
  trigger,
  initial,
}: {
  vehicleId: string;
  systems: MaintSystem[];
  services: ServiceOption[];
  vendors: Vendor[];
  trigger: ReactElement;
  initial?: WorkOrder;
}) {
  // Oficinas que fazem manutenção (+ a já selecionada, mesmo se inativa).
  const maintVendors = vendors.filter(
    (v) => v.isActive && (v.kind === "manutencao" || v.kind === "ambos"),
  );
  if (initial?.vendorId && !maintVendors.some((v) => v.id === initial.vendorId)) {
    const sel = vendors.find((v) => v.id === initial.vendorId);
    if (sel) maintVendors.push(sel);
  }
  const activeServices = services.filter((s) => s.isActive);
  // Agrupa serviços por sistema para o <optgroup>.
  const grouped = systems
    .map((sys) => ({ sys, list: activeServices.filter((s) => s.systemId === sys.id) }))
    .filter((g) => g.list.length > 0);

  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(saveWorkOrder, {});
  const isEdit = !!initial?.id;

  const [odo, setOdo] = useState(initial ? String(initial.odometerKm) : "");
  const [items, setItems] = useState<ItemState[]>(() =>
    initial ? itemsFromOrder(initial) : [emptyItem()],
  );

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOdo(initial ? String(initial.odometerKm) : "");
      setItems(initial ? itemsFromOrder(initial) : [emptyItem()]);
    }
  }, [open, initial]);

  useEffect(() => {
    if (state.ok) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOpen(false);
      router.refresh();
    }
  }, [state.ok, router]);

  const patchItem = (i: number, p: Partial<ItemState>) =>
    setItems((xs) => xs.map((x, k) => (k === i ? { ...x, ...p } : x)));

  function onPickService(i: number, serviceId: string) {
    if (!serviceId) {
      patchItem(i, { serviceId: "", label: "", systemId: "" });
      return;
    }
    const s = activeServices.find((x) => x.id === serviceId);
    if (!s) return;
    const o = kmInt(odo);
    const next =
      s.defaultIntervalKm != null && o != null ? String(o + s.defaultIntervalKm) : items[i].nextKm;
    patchItem(i, { serviceId, label: s.name, systemId: String(s.systemId), nextKm: next });
  }

  const itemTotal = (it: ItemState) =>
    it.pecas.reduce((s, r) => s + num(r.cost), 0) + num(it.mo.cost);
  const total = items.reduce((s, it) => s + itemTotal(it), 0);

  const itemsPayload = JSON.stringify(
    items
      .filter((it) => it.label.trim() && it.systemId)
      .map((it) => ({
        serviceId: it.serviceId || null,
        label: it.label.trim(),
        systemId: Number(it.systemId),
        description: it.description.trim() || null,
        nextKm: it.nextKm || null,
        costs: [
          ...it.pecas.map((r) => ({ ...r, category: "peca" })),
          { ...it.mo, category: "mao_de_obra" },
        ]
          .filter((r) => r.label.trim() && num(r.cost) > 0)
          .map((r) => ({
            category: r.category,
            label: r.label.trim(),
            quantity: num(r.qty) > 0 ? num(r.qty) : null,
            unit: r.unit,
            cost: num(r.cost),
          })),
      })),
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar manutenção" : "Registrar manutenção"}</DialogTitle>
          <DialogDescription>
            Lance a OS da oficina: cada serviço herda o sistema do veículo e alimenta os indicadores
            sozinho.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="space-y-4">
          <input type="hidden" name="vehicleId" value={vehicleId} />
          {initial?.id && <input type="hidden" name="id" value={initial.id} />}
          <input type="hidden" name="odometerKm" value={odo} />
          <input type="hidden" name="items" value={itemsPayload} />

          <div className="grid grid-cols-3 gap-3">
            <div className={field}>
              <label className={labelCls}>Km do veículo</label>
              <input
                inputMode="numeric"
                value={odo}
                onChange={(e) => setOdo(e.target.value)}
                className={inputCls + " mono"}
                placeholder="412747"
                required
              />
            </div>
            <div className={field}>
              <label className={labelCls}>Data (opcional)</label>
              <input
                name="performedAt"
                type="date"
                defaultValue={initial?.performedAt ?? ""}
                className={inputCls}
              />
            </div>
            <div className={field}>
              <label className={labelCls}>Motivo</label>
              <select
                name="reason"
                defaultValue={initial?.reason ?? "corretiva"}
                className={inputCls}
              >
                {Object.entries(REASON_LABEL).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className={field}>
              <label className={labelCls}>Oficina (opcional)</label>
              <select name="vendorId" defaultValue={initial?.vendorId ?? ""} className={inputCls}>
                <option value="">— nenhuma —</option>
                {maintVendors.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
            </div>
            <div className={field}>
              <label className={labelCls}>Nº da OS / nota (opcional)</label>
              <input
                name="osRef"
                defaultValue={initial?.osRef ?? ""}
                className={inputCls}
                placeholder="ex.: OS 4821"
              />
            </div>
          </div>

          {/* --- Serviços executados --- */}
          <div className="space-y-3">
            {items.map((it, i) => (
              <div
                key={i}
                className="space-y-2.5 rounded-2xl border border-[var(--border)] bg-[color-mix(in_oklab,var(--panel-solid)_60%,transparent)] p-3.5"
              >
                <div className="flex items-center gap-2">
                  <select
                    value={it.serviceId}
                    onChange={(e) => onPickService(i, e.target.value)}
                    className={cellCls + " min-w-0 flex-1 px-2.5 font-semibold"}
                  >
                    <option value="">Serviço avulso (digite abaixo)…</option>
                    {grouped.map((g) => (
                      <optgroup key={g.sys.id} label={g.sys.name}>
                        {g.list.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setItems((xs) => xs.filter((_, k) => k !== i))}
                      className="grid size-8 shrink-0 place-items-center rounded-lg text-[var(--text-3)] hover:text-[var(--crit)]"
                      aria-label="Remover serviço"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>

                {!it.serviceId && (
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      value={it.label}
                      onChange={(e) => patchItem(i, { label: e.target.value })}
                      className={cellCls + " px-2.5"}
                      placeholder="nome do serviço"
                    />
                    <select
                      value={it.systemId}
                      onChange={(e) => patchItem(i, { systemId: e.target.value })}
                      className={cellCls + " px-2"}
                    >
                      <option value="">sistema…</option>
                      {systems.map((s) => (
                        <option key={s.id} value={String(s.id)}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <input
                    value={it.description}
                    onChange={(e) => patchItem(i, { description: e.target.value })}
                    className={cellCls + " px-2.5"}
                    placeholder="detalhe / componente (opcional)"
                  />
                  <input
                    inputMode="numeric"
                    value={it.nextKm}
                    onChange={(e) => patchItem(i, { nextKm: e.target.value })}
                    className={cellCls + " mono px-2.5"}
                    placeholder="próxima em (km) — opcional"
                  />
                </div>

                {/* Peças */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold tracking-[0.08em] text-[var(--text-3)] uppercase">
                      Peças
                    </span>
                    <div className="flex gap-1 pr-7 text-[10px] font-bold text-[var(--text-3)] uppercase">
                      <span className="w-12 text-center">Qtd</span>
                      <span className="w-12 text-center">Un.</span>
                      <span className="w-20 text-center">R$</span>
                    </div>
                  </div>
                  {it.pecas.map((r, k) => (
                    <div key={k} className="flex items-center gap-1">
                      <input
                        value={r.label}
                        onChange={(e) =>
                          patchItem(i, {
                            pecas: it.pecas.map((x, y) =>
                              y === k ? { ...x, label: e.target.value } : x,
                            ),
                          })
                        }
                        className={cellCls + " min-w-0 flex-1 px-2.5"}
                        placeholder="peça"
                      />
                      <input
                        inputMode="decimal"
                        value={r.qty}
                        onChange={(e) =>
                          patchItem(i, {
                            pecas: it.pecas.map((x, y) =>
                              y === k ? { ...x, qty: e.target.value } : x,
                            ),
                          })
                        }
                        className={cellCls + " mono w-12 px-1.5 text-right"}
                        placeholder="0"
                      />
                      <select
                        value={r.unit}
                        onChange={(e) =>
                          patchItem(i, {
                            pecas: it.pecas.map((x, y) =>
                              y === k ? { ...x, unit: e.target.value } : x,
                            ),
                          })
                        }
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
                        onChange={(e) =>
                          patchItem(i, {
                            pecas: it.pecas.map((x, y) =>
                              y === k ? { ...x, cost: e.target.value } : x,
                            ),
                          })
                        }
                        className={cellCls + " mono w-20 px-2 text-right"}
                        placeholder="0,00"
                      />
                      <button
                        type="button"
                        onClick={() => patchItem(i, { pecas: it.pecas.filter((_, y) => y !== k) })}
                        className="grid size-6 place-items-center rounded-md text-[var(--text-3)] hover:text-[var(--crit)]"
                        aria-label="Remover peça"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => patchItem(i, { pecas: [...it.pecas, emptyPeca()] })}
                    className="cbtn ghost px-3"
                    style={{ height: 30 }}
                  >
                    <Plus size={14} /> Peça
                  </button>
                </div>

                {/* Mão de obra + subtotal */}
                <div className="flex items-center gap-1">
                  <span className="min-w-0 flex-1 truncate text-sm text-[var(--text-2)]">
                    Mão de obra
                  </span>
                  <input
                    inputMode="decimal"
                    value={it.mo.qty}
                    onChange={(e) => patchItem(i, { mo: { ...it.mo, qty: e.target.value } })}
                    className={cellCls + " mono w-12 px-1.5 text-right"}
                    placeholder="h"
                  />
                  <span className="w-12 text-center text-xs text-[var(--text-3)]">h</span>
                  <input
                    inputMode="decimal"
                    value={it.mo.cost}
                    onChange={(e) => patchItem(i, { mo: { ...it.mo, cost: e.target.value } })}
                    className={cellCls + " mono w-20 px-2 text-right"}
                    placeholder="0,00"
                  />
                  <span className="w-6" />
                </div>
                <div className="flex items-center justify-between border-t border-[var(--border)] pt-2 text-sm">
                  <span className="text-xs text-[var(--text-3)]">Subtotal do serviço</span>
                  <span className="mono font-semibold text-[var(--text)]">
                    {brl(itemTotal(it))}
                  </span>
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={() => setItems((xs) => [...xs, emptyItem()])}
              className="cbtn ghost px-3"
              style={{ height: 34 }}
            >
              <Plus size={14} /> Adicionar serviço
            </button>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--panel-solid)] px-4 py-2.5">
            <span className="text-[11px] font-bold tracking-[0.1em] text-[var(--text-3)] uppercase">
              Total da OS
            </span>
            <span className="mono text-lg font-bold text-[var(--text)]">{brl(total)}</span>
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
