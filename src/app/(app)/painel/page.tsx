import Link from "next/link";
import {
  Truck,
  Users,
  User,
  FileText,
  Plus,
  AlertTriangle,
  CalendarClock,
  Wrench,
  ArrowRight,
} from "lucide-react";
import { getCommandCenter } from "@/lib/data/command";
import { getCurrentProfile } from "@/lib/auth";
import type { StatusTone } from "@/lib/status";
import { Gauge } from "@/components/cris/Gauge";
import { ActionNow } from "@/components/cris/ActionNow";
import { Avatar } from "@/components/cris/Avatar";
import { Coverflow } from "@/components/cris/Coverflow";
import { FleetCard } from "@/components/cris/FleetCard";
import { DriverBigCard } from "@/components/cris/DriverBigCard";

export const dynamic = "force-dynamic";

const TONE_VAR: Record<StatusTone, string> = {
  ok: "var(--ok)",
  warn: "var(--warn)",
  alert: "var(--alert)",
  crit: "var(--crit)",
  idle: "var(--idle)",
};

const LEGEND: { tone: StatusTone; label: string }[] = [
  { tone: "ok", label: "Em dia" },
  { tone: "warn", label: "Atenção" },
  { tone: "alert", label: "Alerta" },
  { tone: "crit", label: "Crítico" },
];

function greeting(h: number) {
  if (h < 12) return "Bom dia.";
  if (h < 18) return "Boa tarde.";
  return "Boa noite.";
}

function pulseDaysText(days: number | null) {
  if (days == null) return "—";
  if (days < 0) return `vencido há ${Math.abs(days)}d`;
  return `vence em ${days}d`;
}

export default async function PainelPage() {
  const [cc, profile] = await Promise.all([getCommandCenter(), getCurrentProfile()]);
  const hour = new Date().getHours();
  const userName = profile?.fullName ?? "Usuário";
  const firstName = userName.split(" ")[0];

  return (
    <div className="pt-1">
      {/* Hero */}
      <div className="cmd-hero-head cmd-in ci-1">
        <div>
          <div className="cmd-hero-badge">
            <span className="dot ok live" />
            <span className="hb-label">Centro de Comando</span>
            <span className="hb-div" />
            <span className="hb-user">
              <Avatar name={userName} size={22} hue={188} /> <b>{firstName}</b>
            </span>
          </div>
          <h1 className="cmd-hero-title">
            {greeting(hour)}
            <br />
            <span className="thin">Sua frota hoje.</span>
          </h1>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <Link href="/frota" className="cbtn ghost">
            <Truck size={17} /> Ver frota
          </Link>
          <button className="cbtn primary">
            <Wrench size={17} /> Lançar manutenção
          </button>
        </div>
      </div>

      {/* Bento */}
      <div className="bento">
        {/* Saúde da frota */}
        <div className="bento-card cmd-command cmd-in ci-2">
          <div className="cc-top">
            <span className="cc-title">Saúde da frota</span>
            <span className="cmd-live" style={{ height: 30, fontSize: 11.5 }}>
              <span className="dot ok live" /> ao vivo
            </span>
          </div>
          <div className="gauge-wrap">
            <Gauge
              pct={cc.conformidadePct}
              segments={LEGEND.map((l) => ({ tone: l.tone, count: cc.counts[l.tone] }))}
              total={cc.total}
            />
          </div>
          <div className="cc-legend">
            {LEGEND.map((l) => (
              <div className="cc-leg" key={l.tone}>
                <span className={`dot ${l.tone}`} />
                <span className="cc-leg-n">{cc.counts[l.tone]}</span>
                <span className="cc-leg-l">{l.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Ação agora */}
        <ActionNow alerts={cc.alerts} />

        {/* Stats */}
        <div className="bento-card cmd-stat cmd-in ci-3" data-tone="crit">
          <div className="cs-ico">
            <AlertTriangle size={19} />
          </div>
          <div className="cs-num">{cc.criticos}</div>
          <div className="cs-lbl">Críticos / vencidos</div>
          <div className="cs-break">
            <span className="cs-seg">
              <span className="cs-ic">
                <Truck size={14} />
              </span>
              <b>{cc.vehCrit}</b> veículos
            </span>
            <span className="cs-seg">
              <span className="cs-ic">
                <Users size={14} />
              </span>
              <b>{cc.drvCrit}</b> motoristas
            </span>
          </div>
        </div>
        <div className="bento-card cmd-stat cmd-in ci-3" data-tone="warn">
          <div className="cs-ico">
            <CalendarClock size={19} />
          </div>
          <div className="cs-num">{cc.vencendo30}</div>
          <div className="cs-lbl">Vencendo em 30 dias</div>
          <div className="cs-break">
            <span className="cs-seg">
              <span className="dot alert" />
              <b>{cc.vencendo15}</b> em 15 dias
            </span>
            <span className="cs-seg">
              <span className="dot warn" />
              <b>{cc.vencendo30}</b> em 30 dias
            </span>
          </div>
        </div>
      </div>

      {/* Pulso da frota */}
      <div style={{ marginTop: 18 }}>
        <div className="bento-card pulse-card cmd-in ci-4">
          <div className="pulse-head">
            <span className="pulse-title">Pulso da frota</span>
            <span className="cmd-section-count">{cc.total} veículos</span>
            <div className="pulse-legend">
              <span>
                <span className="dot ok" /> em dia
              </span>
              <span>
                <span className="dot warn" /> atenção
              </span>
              <span>
                <span className="dot alert" /> alerta
              </span>
              <span>
                <span className="dot crit" /> crítico
              </span>
            </div>
          </div>
          <div className="pulse-strip">
            {cc.pulse.map((p, i) => (
              <div
                key={i}
                className="pulse-col"
                data-st={p.tone}
                style={{ "--bar": TONE_VAR[p.tone] } as React.CSSProperties}
              >
                <div className="pulse-track">
                  <div className="pulse-fill" style={{ height: `${p.fill}%` }}>
                    <span className="pulse-tip" />
                  </div>
                </div>
                <div className="pulse-lbl">
                  <span className="pl-plate">{p.plate}</span>
                  <span className="pl-driver">{p.driverFirst ?? "—"}</span>
                </div>
                <div className="pulse-pop">
                  <div className="pp-top">
                    <span className={`dot ${p.tone}`} />
                    <span className="pp-plate">{p.plate}</span>
                  </div>
                  <div className="pp-model">
                    {p.model ?? "—"} · {p.typeLabel}
                  </div>
                  <div className="pp-row">
                    <User size={13} /> {p.driverName ?? "sem motorista"}
                  </div>
                  <div className="pp-row">
                    <FileText size={13} />{" "}
                    {p.worstDocLabel ? (
                      <>
                        {p.worstDocLabel}:{" "}
                        <span className="mono">{pulseDaysText(p.worstDays)}</span>
                      </>
                    ) : (
                      "sem documentos"
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Frota cinematográfica */}
      <section className="cmd-section cmd-in ci-5">
        <div className="cmd-section-head">
          <span className="cmd-section-ico">
            <Truck size={20} />
          </span>
          <h2 className="cmd-section-title">Frota</h2>
          <span className="cmd-section-count">{cc.total} veículos</span>
          <span className="cmd-section-rule" />
          <Link href="/frota" className="link-btn">
            Ver todos <ArrowRight size={15} />
          </Link>
        </div>
        <Coverflow>
          {cc.fleet.map((v) => (
            <FleetCard key={v.id} v={v} />
          ))}
        </Coverflow>
      </section>

      {/* Motoristas */}
      <section className="cmd-section cmd-in ci-6">
        <div className="cmd-section-head">
          <span className="cmd-section-ico">
            <Users size={20} />
          </span>
          <h2 className="cmd-section-title">Motoristas</h2>
          <span className="cmd-section-count">{cc.crew.length} ativos</span>
          <span className="cmd-section-rule" />
          <Link href="/motoristas" className="link-btn">
            Ver todos <ArrowRight size={15} />
          </Link>
        </div>
        <Coverflow>
          {cc.crew.map((d) => (
            <DriverBigCard key={d.id} d={d} />
          ))}
        </Coverflow>
      </section>

      {/* Ocorrências + Atalhos */}
      <div className="cmd-two cmd-in ci-7">
        <div className="bento-card feed-card">
          <div className="cmd-section-head" style={{ marginBottom: 8 }}>
            <h2 className="cmd-section-title" style={{ fontSize: 20 }}>
              Ocorrências ao vivo
            </h2>
            <span className="cmd-section-count">0</span>
          </div>
          <div className="feed-empty">
            Nenhuma ocorrência aberta. Quando um motorista reportar um problema pelo app, aparece
            aqui.
          </div>
        </div>

        <div>
          <div className="cmd-section-head" style={{ marginBottom: 14 }}>
            <h2 className="cmd-section-title" style={{ fontSize: 20 }}>
              Atalhos
            </h2>
          </div>
          <div className="act-stack">
            <Link href="/frota" className="act-btn">
              <span className="act-ico">
                <Plus size={24} />
              </span>
              <span className="act-txt">
                <b>Cadastrar veículo</b>
                <span>Nova placa na frota</span>
              </span>
              <ArrowRight size={18} className="act-arrow" />
            </Link>
            <Link href="/motoristas" className="act-btn">
              <span className="act-ico">
                <Users size={24} />
              </span>
              <span className="act-txt">
                <b>Cadastrar motorista</b>
                <span>Novo condutor</span>
              </span>
              <ArrowRight size={18} className="act-arrow" />
            </Link>
            <button className="act-btn">
              <span className="act-ico">
                <Wrench size={24} />
              </span>
              <span className="act-txt">
                <b>Lançar manutenção</b>
                <span>NF · fornecedor · valor · KM</span>
              </span>
              <ArrowRight size={18} className="act-arrow" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
