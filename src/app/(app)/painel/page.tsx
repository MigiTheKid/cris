import Link from "next/link";
import { Truck, Users, AlertTriangle, CalendarClock } from "lucide-react";
import { getFleetDashboard } from "@/lib/data/dashboard";
import { getVehicleList } from "@/lib/data/vehicles";
import { getDriverCards } from "@/lib/data/drivers";
import { vehicleTypeLabel, vehicleDocLabel } from "@/lib/labels";
import { statusTone } from "@/lib/status";
import { HealthGauge } from "@/components/cris/HealthGauge";
import { Avatar } from "@/components/cris/Avatar";

export const dynamic = "force-dynamic";

function greeting(h: number) {
  if (h < 12) return "Bom dia.";
  if (h < 18) return "Boa tarde.";
  return "Boa noite.";
}

function daysLabel(days: number) {
  if (days < 0) return `vencido há ${Math.abs(days)}d`;
  if (days === 0) return "vence hoje";
  return `vence em ${days}d`;
}

export default async function PainelPage() {
  const [dash, vehicles, drivers] = await Promise.all([
    getFleetDashboard(),
    getVehicleList(),
    getDriverCards(),
  ]);

  const hour = new Date().getHours();

  return (
    <div className="space-y-9 py-2">
      {/* Hero */}
      <header>
        <span className="cmd-badge">
          <span className="dot ok live" />
          <span className="tag">Centro de Comando</span>
          <span className="text-[var(--text-3)]">·</span>
          Gabriel
        </span>
        <h1 className="hero-title">
          {greeting(hour)}
          <br />
          <span className="dim">Sua frota hoje.</span>
        </h1>
      </header>

      {/* Bento */}
      <section className="grid gap-4 lg:grid-cols-12">
        {/* Saúde da frota */}
        <div className="cris-card lg:col-span-5">
          <div className="eyebrow mb-5">Saúde da frota</div>
          <HealthGauge
            counts={dash.counts}
            total={dash.total}
            conformidadePct={dash.conformidadePct}
          />
        </div>

        {/* Ação agora */}
        <div className="cris-card lg:col-span-4">
          <div className="eyebrow mb-4 flex items-center gap-2">
            <span className="dot crit" />
            Ação agora
          </div>
          {dash.criticalItems.length === 0 ? (
            <p className="py-8 text-center text-sm text-[var(--text-3)]">
              Nenhum documento crítico. Tudo sob controle. 🎉
            </p>
          ) : (
            <ul className="space-y-3">
              {dash.criticalItems.slice(0, 4).map((it, i) => (
                <li key={i} className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-semibold text-[var(--text)]">
                      {vehicleDocLabel(it.docType)}
                    </div>
                    <div className="mono text-xs text-[var(--text-3)]">
                      {it.plate} · {it.model ?? "—"}
                    </div>
                  </div>
                  <span className="days-pill crit">{daysLabel(it.days)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Stats */}
        <div className="grid gap-4 lg:col-span-3">
          <div className="cris-card">
            <AlertTriangle size={20} className="mb-2 text-[var(--crit)]" />
            <div className="stat-num">{dash.criticos}</div>
            <div className="mt-1 text-sm text-[var(--text-3)]">Críticos / vencidos</div>
          </div>
          <div className="cris-card">
            <CalendarClock size={20} className="mb-2 text-[var(--alert)]" />
            <div className="stat-num">{dash.vencendo30}</div>
            <div className="mt-1 text-sm text-[var(--text-3)]">
              Vencendo em 30 dias
              <span className="mt-0.5 block text-xs">{dash.vencendo15} em 15 dias</span>
            </div>
          </div>
        </div>
      </section>

      {/* Frota */}
      <section>
        <div className="mb-3 flex items-center gap-3">
          <Truck size={18} className="text-[var(--brand-amber)]" />
          <h2 className="text-lg font-semibold text-[var(--text)]">Frota</h2>
          <span className="text-sm text-[var(--text-3)]">{vehicles.length} veículos</span>
          <Link
            href="/frota"
            className="ml-auto text-sm font-semibold text-[var(--teal-bright)] hover:text-[var(--brand-amber)]"
          >
            Ver todos
          </Link>
        </div>
        <div className="cf-rail">
          {vehicles.map((v) => {
            const { tone, label } = statusTone(v.status);
            return (
              <Link key={v.id} href="/frota" className="cf-card block">
                <div className="cf-thumb">
                  <Truck size={30} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="plate-chip">{v.plate}</span>
                  <span className={`dot ${tone}`} title={label} />
                </div>
                <div className="mt-2 truncate font-semibold text-[var(--text)]">
                  {v.model ?? "—"}
                </div>
                <div className="text-xs text-[var(--text-3)]">
                  {vehicleTypeLabel(v.vehicleType)}
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Motoristas */}
      <section>
        <div className="mb-3 flex items-center gap-3">
          <Users size={18} className="text-[var(--brand-amber)]" />
          <h2 className="text-lg font-semibold text-[var(--text)]">Motoristas</h2>
          <span className="text-sm text-[var(--text-3)]">{drivers.length} condutores</span>
          <Link
            href="/motoristas"
            className="ml-auto text-sm font-semibold text-[var(--teal-bright)] hover:text-[var(--brand-amber)]"
          >
            Ver todos
          </Link>
        </div>
        <div className="cf-rail">
          {drivers.map((d) => (
            <Link key={d.id} href="/motoristas" className="cf-card block">
              <div className="flex flex-col items-center gap-3 py-2">
                <Avatar name={d.name} size={64} />
                <div className="text-center">
                  <div className="font-semibold text-[var(--text)]">{d.name}</div>
                  {d.vehiclePlate ? (
                    <span className="plate-chip mt-1 inline-flex">{d.vehiclePlate}</span>
                  ) : (
                    <div className="mt-1 text-xs text-[var(--text-3)]">sem veículo</div>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
