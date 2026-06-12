import Link from "next/link";
import {
  Droplet,
  Wrench,
  Fuel,
  Plus,
  Pencil,
  AlertTriangle,
  Building2,
  ListChecks,
} from "lucide-react";
import { getOilAnalytics } from "@/lib/data/oil-changes";
import { getMaintAnalytics, getMaintenanceCatalog } from "@/lib/data/maintenance";
import { getVendors, VENDOR_KIND_LABEL } from "@/lib/data/vendors";
import { StatusBadge } from "@/components/cris/StatusBadge";
import { VendorDialog } from "@/components/cris/VendorDialog";
import { DeleteVendorButton } from "@/components/cris/DeleteVendorButton";
import { ServiceCatalogDialog } from "@/components/cris/ServiceCatalogDialog";
import { DeleteServiceButton } from "@/components/cris/DeleteServiceButton";
import { OsPhotoLauncher } from "@/components/cris/OsPhotoLauncher";

export const dynamic = "force-dynamic";

function money(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default async function TmaPage() {
  const [a, m, catalog, vendors] = await Promise.all([
    getOilAnalytics(),
    getMaintAnalytics(),
    getMaintenanceCatalog(),
    getVendors(),
  ]);
  const alerts = a.due.filter((d) => d.tone === "crit" || d.tone === "warn");
  const maxInsumo = Math.max(...a.byInsumo.map((i) => i.total), 0);
  const maxSystem = Math.max(...m.bySystem.map((s) => s.total), 0);

  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">🛠️ T.M.A.</div>
          <h1 className="page-title">Troca de óleo · Manutenção · Abastecimento</h1>
          <p className="page-sub">Custos e indicadores da frota, por seção</p>
        </div>
        <div className="page-actions">
          <OsPhotoLauncher />
          <VendorDialog
            trigger={
              <button className="cbtn primary">
                <Plus size={16} /> Nova oficina
              </button>
            }
          />
        </div>
      </div>

      {/* ===== Troca de óleo ===== */}
      <section className="mb-8">
        <div className="cmd-section-head">
          <span className="cmd-section-ico">
            <Droplet size={20} />
          </span>
          <h2 className="cmd-section-title" style={{ fontSize: 22 }}>
            Troca de óleo
          </h2>
          <span className="cmd-section-rule" />
        </div>

        {/* KPIs */}
        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Kpi label="Gasto total" value={a.totalSpent > 0 ? money(a.totalSpent) : "—"} />
          <Kpi label="Trocas registradas" value={String(a.changeCount)} />
          <Kpi label="Custo médio/troca" value={a.changeCount ? money(a.avgPerChange) : "—"} />
          <Kpi
            label="Preço médio do óleo"
            value={a.oilPricePerLiter != null ? `${money(a.oilPricePerLiter)}/L` : "—"}
          />
        </div>

        {/* Alertas de próxima troca */}
        <div className="glass mb-4 rounded-2xl p-5">
          <div className="mb-3 flex items-center gap-2">
            <AlertTriangle size={16} className="text-[var(--warn)]" />
            <span className="text-sm font-bold text-[var(--text)]">Próximas trocas</span>
          </div>
          {alerts.length === 0 ? (
            <p className="text-sm text-[var(--text-3)]">Nenhuma troca vencida ou chegando. 👍</p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {alerts.map((d) => (
                <Link
                  key={d.vehicleId}
                  href={`/frota/${d.vehicleId}`}
                  className="flex items-center justify-between rounded-xl border border-[var(--border)] px-4 py-2.5 hover:bg-[var(--hover)]"
                >
                  <span className="mono font-semibold text-[var(--text)]">{d.plate}</span>
                  <span className="flex items-center gap-2">
                    <span className="text-xs text-[var(--text-3)]">
                      próxima {d.nextKm.toLocaleString("pt-BR")} km
                    </span>
                    <span className={`dot ${d.tone}`} />
                    <span
                      className="text-sm font-semibold"
                      style={{ color: d.tone === "crit" ? "var(--crit)" : "var(--warn)" }}
                    >
                      {d.label}
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {/* Custo por insumo + mão de obra */}
          <div className="glass rounded-2xl p-5">
            <div className="mb-3 text-sm font-bold text-[var(--text)]">Custo por insumo</div>
            {a.byInsumo.length === 0 && a.laborTotal === 0 ? (
              <p className="text-sm text-[var(--text-3)]">Sem custos lançados ainda.</p>
            ) : (
              <div className="flex flex-col gap-2.5">
                {a.byInsumo.map((i) => (
                  <div key={i.label}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-[var(--text-2)]">
                        {i.label}
                        {i.qty > 0 && (
                          <span className="text-[var(--text-3)]">
                            {" "}
                            · {String(i.qty).replace(".", ",")} {i.unit}
                          </span>
                        )}
                      </span>
                      <span className="mono font-semibold text-[var(--text)]">
                        {money(i.total)}
                      </span>
                    </div>
                    <span className="cpk-bar mt-1">
                      <span
                        className="cpk-bar-fill"
                        style={{
                          width: `${maxInsumo ? Math.max((i.total / maxInsumo) * 100, 4) : 0}%`,
                        }}
                      />
                    </span>
                  </div>
                ))}
                <div className="mt-1 flex items-center justify-between border-t border-[var(--border)] pt-2 text-sm">
                  <span className="font-semibold text-[var(--text-2)]">Mão de obra</span>
                  <span className="mono font-semibold text-[var(--text)]">
                    {money(a.laborTotal)}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Ranking de oficinas */}
          <div className="glass rounded-2xl p-5">
            <div className="mb-3 text-sm font-bold text-[var(--text)]">Custo por oficina</div>
            {a.byVendor.length === 0 ? (
              <p className="text-sm text-[var(--text-3)]">Nenhuma troca com oficina ainda.</p>
            ) : (
              <div className="flex flex-col gap-1.5">
                {a.byVendor.map((v) => (
                  <div
                    key={v.name}
                    className="flex items-center justify-between rounded-xl border border-[var(--border)] px-3 py-2"
                  >
                    <span className="text-sm font-semibold text-[var(--text)]">{v.name}</span>
                    <span className="text-sm text-[var(--text-3)]">
                      <span className="mono font-semibold text-[var(--text)]">
                        {money(v.total)}
                      </span>{" "}
                      · {v.count}×
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ===== Oficinas ===== */}
      <section className="mb-8">
        <div className="cmd-section-head">
          <span className="cmd-section-ico">
            <Building2 size={20} />
          </span>
          <h2 className="cmd-section-title" style={{ fontSize: 22 }}>
            Oficinas
          </h2>
          <span className="cmd-section-count">{vendors.length}</span>
          <span className="cmd-section-rule" />
          <VendorDialog
            trigger={
              <button className="cbtn ghost" style={{ height: 40 }}>
                <Plus size={16} /> Nova oficina
              </button>
            }
          />
        </div>
        <div className="glass overflow-hidden rounded-3xl">
          <table className="w-full border-collapse text-left">
            <tbody>
              {vendors.map((v) => (
                <tr
                  key={v.id}
                  className="border-b border-[var(--border)] last:border-0"
                  style={{ opacity: v.isActive ? 1 : 0.5 }}
                >
                  <td className="px-5 py-3 font-semibold text-[var(--text)]">{v.name}</td>
                  <td className="px-5 py-3 text-sm text-[var(--text-2)]">
                    {VENDOR_KIND_LABEL[v.kind]}
                  </td>
                  <td className="px-5 py-3 text-sm text-[var(--text-3)]">{v.city ?? "—"}</td>
                  <td className="px-5 py-3 text-sm text-[var(--text-3)]">{v.phone ?? "—"}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-1.5">
                      <VendorDialog
                        initial={{
                          id: v.id,
                          name: v.name,
                          kind: v.kind,
                          phone: v.phone,
                          city: v.city,
                          notes: v.notes,
                          isActive: v.isActive,
                        }}
                        trigger={
                          <button className="d-mini-btn" title="Editar">
                            <Pencil size={15} />
                          </button>
                        }
                      />
                      <DeleteVendorButton vendorId={v.id} name={v.name} />
                    </div>
                  </td>
                </tr>
              ))}
              {vendors.length === 0 && (
                <tr>
                  <td className="px-5 py-12 text-center text-sm text-[var(--text-3)]">
                    Nenhuma oficina. Cadastre pelo botão “Nova oficina”.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ===== Manutenções ===== */}
      <section className="mb-8">
        <div className="cmd-section-head">
          <span className="cmd-section-ico">
            <Wrench size={20} />
          </span>
          <h2 className="cmd-section-title" style={{ fontSize: 22 }}>
            Manutenções
          </h2>
          <span className="cmd-section-rule" />
        </div>

        {/* KPIs */}
        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Kpi label="Gasto total" value={m.totalSpent > 0 ? money(m.totalSpent) : "—"} />
          <Kpi label="OSs registradas" value={String(m.orderCount)} />
          <Kpi label="Custo médio/OS" value={m.orderCount ? money(m.avgPerOrder) : "—"} />
          <Kpi
            label="Corretiva (meta ≤ 25%)"
            value={
              m.correctiveSharePct != null
                ? `${m.correctiveSharePct.toFixed(0).replace(".", ",")}%`
                : "—"
            }
          />
        </div>

        {/* Alertas de próximas intervenções */}
        <div className="glass mb-4 rounded-2xl p-5">
          <div className="mb-3 flex items-center gap-2">
            <AlertTriangle size={16} className="text-[var(--warn)]" />
            <span className="text-sm font-bold text-[var(--text)]">Próximas intervenções</span>
          </div>
          {m.due.length === 0 ? (
            <p className="text-sm text-[var(--text-3)]">
              Nenhuma intervenção vencida ou chegando. 👍
            </p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {m.due.map((d, i) => (
                <Link
                  key={`${d.vehicleId}-${i}`}
                  href={`/frota/${d.vehicleId}`}
                  className="flex items-center justify-between rounded-xl border border-[var(--border)] px-4 py-2.5 hover:bg-[var(--hover)]"
                >
                  <span className="min-w-0 truncate">
                    <span className="mono font-semibold text-[var(--text)]">{d.plate}</span>
                    <span className="ml-2 text-sm text-[var(--text-2)]">{d.label}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    <span className="text-xs text-[var(--text-3)]">
                      em {d.nextKm.toLocaleString("pt-BR")} km
                    </span>
                    <span className={`dot ${d.tone}`} />
                    <span
                      className="text-sm font-semibold"
                      style={{ color: d.tone === "crit" ? "var(--crit)" : "var(--warn)" }}
                    >
                      {d.statusLabel}
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          {/* Custo por sistema */}
          <div className="glass rounded-2xl p-5">
            <div className="mb-3 text-sm font-bold text-[var(--text)]">Custo por sistema</div>
            {m.bySystem.length === 0 ? (
              <p className="text-sm text-[var(--text-3)]">Sem manutenções lançadas ainda.</p>
            ) : (
              <div className="flex flex-col gap-2.5">
                {m.bySystem.map((s) => (
                  <div key={s.name}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-[var(--text-2)]">
                        {s.name}
                        <span className="text-[var(--text-3)]"> · {s.count}×</span>
                      </span>
                      <span className="mono font-semibold text-[var(--text)]">
                        {money(s.total)}
                      </span>
                    </div>
                    <span className="cpk-bar mt-1">
                      <span
                        className="cpk-bar-fill"
                        style={{
                          width: `${maxSystem ? Math.max((s.total / maxSystem) * 100, 4) : 0}%`,
                        }}
                      />
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Custo por veículo */}
          <div className="glass rounded-2xl p-5">
            <div className="mb-3 text-sm font-bold text-[var(--text)]">Custo por veículo</div>
            {m.byVehicle.length === 0 ? (
              <p className="text-sm text-[var(--text-3)]">Sem manutenções lançadas ainda.</p>
            ) : (
              <div className="flex flex-col gap-1.5">
                {m.byVehicle.slice(0, 8).map((v) => (
                  <Link
                    key={v.vehicleId}
                    href={`/frota/${v.vehicleId}`}
                    className="flex items-center justify-between rounded-xl border border-[var(--border)] px-3 py-2 hover:bg-[var(--hover)]"
                  >
                    <span className="mono text-sm font-semibold text-[var(--text)]">{v.plate}</span>
                    <span className="text-sm text-[var(--text-3)]">
                      <span className="mono font-semibold text-[var(--text)]">
                        {money(v.total)}
                      </span>{" "}
                      · {v.count}×
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Custo por oficina */}
          <div className="glass rounded-2xl p-5">
            <div className="mb-3 text-sm font-bold text-[var(--text)]">Custo por oficina</div>
            {m.byVendor.length === 0 ? (
              <p className="text-sm text-[var(--text-3)]">Nenhuma OS com oficina ainda.</p>
            ) : (
              <div className="flex flex-col gap-1.5">
                {m.byVendor.map((v) => (
                  <div
                    key={v.name}
                    className="flex items-center justify-between rounded-xl border border-[var(--border)] px-3 py-2"
                  >
                    <span className="text-sm font-semibold text-[var(--text)]">{v.name}</span>
                    <span className="text-sm text-[var(--text-3)]">
                      <span className="mono font-semibold text-[var(--text)]">
                        {money(v.total)}
                      </span>{" "}
                      · {v.count}×
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ===== Catálogo de serviços ===== */}
      <section className="mb-8">
        <div className="cmd-section-head">
          <span className="cmd-section-ico">
            <ListChecks size={20} />
          </span>
          <h2 className="cmd-section-title" style={{ fontSize: 22 }}>
            Catálogo de serviços
          </h2>
          <span className="cmd-section-count">{catalog.services.length}</span>
          <span className="cmd-section-rule" />
          <ServiceCatalogDialog
            systems={catalog.systems}
            trigger={
              <button className="cbtn ghost" style={{ height: 40 }}>
                <Plus size={16} /> Novo serviço
              </button>
            }
          />
        </div>
        <div className="glass overflow-hidden rounded-3xl">
          <table className="w-full border-collapse text-left">
            <tbody>
              {catalog.services.map((s) => (
                <tr
                  key={s.id}
                  className="border-b border-[var(--border)] last:border-0"
                  style={{ opacity: s.isActive ? 1 : 0.5 }}
                >
                  <td className="px-5 py-2.5 text-sm font-semibold text-[var(--text)]">{s.name}</td>
                  <td className="px-5 py-2.5 text-sm text-[var(--text-2)]">{s.systemName}</td>
                  <td className="mono px-5 py-2.5 text-sm text-[var(--text-3)]">
                    {s.defaultIntervalKm != null
                      ? `${s.defaultIntervalKm.toLocaleString("pt-BR")} km`
                      : "—"}
                  </td>
                  <td className="px-5 py-2.5">
                    <div className="flex items-center justify-end gap-1.5">
                      <ServiceCatalogDialog
                        systems={catalog.systems}
                        initial={{
                          id: s.id,
                          name: s.name,
                          systemId: s.systemId,
                          defaultIntervalKm: s.defaultIntervalKm,
                          isActive: s.isActive,
                        }}
                        trigger={
                          <button className="d-mini-btn" title="Editar">
                            <Pencil size={15} />
                          </button>
                        }
                      />
                      <DeleteServiceButton serviceId={s.id} name={s.name} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ===== Abastecimento (M3) ===== */}
      <div className="glass flex items-center gap-4 rounded-2xl p-5">
        <span className="grid size-11 place-items-center rounded-xl bg-[var(--panel-solid)] text-[var(--text-3)]">
          <Fuel size={20} />
        </span>
        <div className="flex-1">
          <div className="font-bold text-[var(--text)]">Abastecimentos</div>
          <div className="text-xs text-[var(--text-3)]">Indicadores entram na milestone M3.</div>
        </div>
        <StatusBadge tone="idle" label="Planejado · M3" />
      </div>
    </>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass rounded-2xl p-4">
      <div className="text-[11px] font-bold tracking-[0.1em] text-[var(--text-3)] uppercase">
        {label}
      </div>
      <div className="mono mt-1 text-xl font-bold text-[var(--text)]">{value}</div>
    </div>
  );
}
