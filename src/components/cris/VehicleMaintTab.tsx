"use client";

import { Plus, Pencil, Wrench, Trash2 } from "lucide-react";
import { StatusBadge } from "./StatusBadge";
import { WorkOrderDialog } from "./WorkOrderDialog";
import { PhotoWorkOrder } from "./PhotoWorkOrder";
import { DangerDeleteDialog } from "./DangerDeleteDialog";
import { deleteWorkOrder } from "@/lib/actions/work-orders";
import { REASON_LABEL } from "@/lib/maintenance-labels";
import type { MaintSystem, ServiceOption, VehicleMaintenance } from "@/lib/data/maintenance";
import type { Vendor } from "@/lib/data/vendors";

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const km = (v: number) => `${v.toLocaleString("pt-BR")} km`;
const dateBr = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}`;

/** Aba "Manutenções" do veículo: próximas intervenções + histórico de OSs. */
export function VehicleMaintTab({
  vehicleId,
  maint,
  systems,
  services,
  vendors,
}: {
  vehicleId: string;
  maint: VehicleMaintenance;
  systems: MaintSystem[];
  services: ServiceOption[];
  vendors: Vendor[];
}) {
  const alerts = maint.upcoming.filter((u) => u.tone === "crit" || u.tone === "warn");
  const okNext = maint.upcoming.filter((u) => u.tone === "ok");

  return (
    <div>
      <div className="comp-head">
        <div className="glass flex-1 rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[11px] font-bold tracking-[0.1em] text-[var(--text-3)] uppercase">
                Próximas intervenções
              </div>
              <div className="mt-1 text-sm text-[var(--text-3)]">
                {maint.latestKm != null ? (
                  <>
                    km atual (estimado):{" "}
                    <span className="mono font-semibold text-[var(--text)]">
                      {km(maint.latestKm)}
                    </span>
                  </>
                ) : (
                  "sem km de referência ainda"
                )}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[11px] font-bold tracking-[0.1em] text-[var(--text-3)] uppercase">
                Gasto total
              </div>
              <div className="mono mt-1 text-xl font-bold text-[var(--text)]">
                {maint.totalSpent > 0 ? brl(maint.totalSpent) : "—"}
              </div>
            </div>
          </div>
          {maint.upcoming.length > 0 && (
            <div className="mt-4 flex flex-col gap-1.5 border-t border-[var(--border)] pt-3">
              {[...alerts, ...okNext].map((u, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="text-[var(--text-2)]">
                    {u.label}
                    <span className="text-[var(--text-3)]"> · {u.systemName}</span>
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="mono text-xs text-[var(--text-3)]">{km(u.nextKm)}</span>
                    <StatusBadge tone={u.tone} label={u.statusLabel} />
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="flex flex-col items-stretch gap-2">
          <WorkOrderDialog
            vehicleId={vehicleId}
            systems={systems}
            services={services}
            vendors={vendors}
            trigger={
              <button className="cbtn primary" style={{ height: 40 }}>
                <Plus size={16} /> Registrar manutenção
              </button>
            }
          />
          <PhotoWorkOrder
            vehicleId={vehicleId}
            systems={systems}
            services={services}
            vendors={vendors}
          />
        </div>
      </div>

      <div className="eyebrow" style={{ margin: "26px 0 12px" }}>
        Histórico de manutenções
      </div>
      {maint.orders.length > 0 ? (
        <div className="flex flex-col gap-2">
          {maint.orders.map((o) => (
            <div key={o.id} className="rounded-xl border border-[var(--border)] px-4 py-3">
              <div className="flex items-center gap-3">
                <Wrench size={16} className="shrink-0 text-[var(--text-3)]" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-[var(--text)]">
                    <span className="mono">{km(o.odometerKm)}</span>
                    <span className="ml-2 rounded-md border border-[var(--border)] px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-[var(--text-2)] uppercase">
                      {REASON_LABEL[o.reason]}
                    </span>
                  </div>
                  <div className="text-xs text-[var(--text-3)]">
                    {[
                      o.performedAt ? dateBr(o.performedAt) : null,
                      o.vendorName,
                      o.osRef,
                      o.total > 0 ? brl(o.total) : null,
                    ]
                      .filter(Boolean)
                      .join(" · ") || "sem detalhes"}
                  </div>
                </div>
                <WorkOrderDialog
                  vehicleId={vehicleId}
                  systems={systems}
                  services={services}
                  vendors={vendors}
                  initial={o}
                  trigger={
                    <button className="d-mini-btn" title="Editar">
                      <Pencil size={15} />
                    </button>
                  }
                />
                <DangerDeleteDialog
                  trigger={
                    <button className="d-mini-btn danger" title="Excluir OS">
                      <Trash2 size={15} />
                    </button>
                  }
                  title="Excluir manutenção"
                  description={`Excluir a OS de ${km(o.odometerKm)}? Isto não pode ser desfeito.`}
                  confirmWord="EXCLUIR"
                  consequences={[
                    "Remove a OS e todos os itens/custos dela",
                    "Os indicadores são recalculados sem este registro",
                  ]}
                  action={() => deleteWorkOrder(o.id, vehicleId)}
                />
              </div>
              {o.items.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1 pl-7">
                  {o.items.map((i) => (
                    <span
                      key={i.id}
                      className="rounded-md border border-[var(--border)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--text-2)]"
                      title={i.description ?? undefined}
                    >
                      {i.label}
                      <span className="text-[var(--text-3)]"> · {i.systemName}</span>
                      {i.total > 0 && <span className="mono"> · {brl(i.total)}</span>}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="vd-hist">Nenhuma manutenção registrada ainda.</div>
      )}
    </div>
  );
}
