import Link from "next/link";
import { ChevronLeft, RotateCcw, ShoppingCart, TrendingDown, Layers } from "lucide-react";
import { getTireAnalytics } from "@/lib/data/tires";
import { getTireThresholds } from "@/lib/data/settings";
import { MAX_RECAP_LIVES } from "@/lib/tires";

export const dynamic = "force-dynamic";

function money(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function cpkFmt(v: number | null) {
  return v != null ? `R$ ${v.toFixed(2).replace(".", ",")}` : "—";
}
function mm(v: number | null) {
  return v != null ? `${String(v).replace(".", ",")} mm` : "—";
}

export default async function PneusAnalisePage() {
  const [a, thresholds] = await Promise.all([getTireAnalytics(), getTireThresholds()]);

  const actionCount = a.decision.recap.length + a.decision.buy.length;
  // Pior CPK entre marcas com dado, para escalar as barras.
  const maxCpk = Math.max(...a.byBrand.filter((b) => b.cpk != null).map((b) => b.cpk as number), 0);

  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">◎ Pneus · Análise</div>
          <h1 className="page-title">Indicadores de pneus</h1>
          <p className="page-sub">CPK, decisão de compra e reaproveitamento de carcaça</p>
        </div>
        <Link href="/pneus" className="cbtn ghost" style={{ height: 40 }}>
          <ChevronLeft size={16} /> Pneus
        </Link>
      </div>

      {/* KPIs */}
      <div className="mb-7 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="glass rounded-2xl p-4">
          <div className="text-[11px] font-bold tracking-[0.1em] text-[var(--text-3)] uppercase">
            Investido no parque
          </div>
          <div className="mono mt-1 text-xl font-bold text-[var(--text)]">
            {a.fleet.totalInvested > 0 ? money(a.fleet.totalInvested) : "—"}
          </div>
        </div>
        <div className="glass rounded-2xl p-4">
          <div className="text-[11px] font-bold tracking-[0.1em] text-[var(--text-3)] uppercase">
            CPK médio da frota
          </div>
          <div className="mono mt-1 text-xl font-bold text-[var(--text)]">
            {cpkFmt(a.fleet.fleetCpk)}
            {a.fleet.fleetCpk != null && (
              <span className="text-xs font-semibold text-[var(--text-3)]"> /km</span>
            )}
          </div>
          <div className="mt-1 text-xs text-[var(--text-3)]">
            {a.fleet.tiresWithCpk} pneus com base
          </div>
        </div>
        <div className="glass rounded-2xl p-4">
          <div className="text-[11px] font-bold tracking-[0.1em] text-[var(--text-3)] uppercase">
            Em uso
          </div>
          <div className="mono mt-1 text-xl font-bold text-[var(--text)]">{a.fleet.inUse}</div>
        </div>
        <div className="glass rounded-2xl p-4">
          <div className="text-[11px] font-bold tracking-[0.1em] text-[var(--text-3)] uppercase">
            Precisam de ação
          </div>
          <div
            className="mono mt-1 text-xl font-bold"
            style={{ color: actionCount > 0 ? "var(--warn)" : "var(--text)" }}
          >
            {actionCount}
          </div>
          <div className="mt-1 text-xs text-[var(--text-3)]">na janela de recape ou abaixo</div>
        </div>
      </div>

      {/* CPK por marca */}
      <section className="mb-8">
        <div className="cmd-section-head">
          <span className="cmd-section-ico">
            <TrendingDown size={20} />
          </span>
          <h2 className="cmd-section-title" style={{ fontSize: 22 }}>
            Custo por km, por marca
          </h2>
          <span className="cmd-section-rule" />
        </div>
        <div className="glass overflow-hidden rounded-3xl">
          {a.byBrand.length === 0 ? (
            <div className="px-5 py-12 text-center text-sm text-[var(--text-3)]">
              Nenhum pneu cadastrado ainda.
            </div>
          ) : (
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="text-[var(--text-3)]">
                  {["Marca", "Pneus", "Km rodada", "Custo", "CPK (R$/km)", ""].map((h, i) => (
                    <th
                      key={i}
                      className="border-b border-[var(--border)] px-5 py-3.5 text-[11px] font-bold tracking-[0.12em] uppercase"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {a.byBrand.map((b, i) => (
                  <tr key={b.brand} className="border-b border-[var(--border)] last:border-0">
                    <td className="px-5 py-3 font-semibold text-[var(--text)]">
                      {i === 0 && b.cpk != null && (
                        <span className="mr-2 inline-block rounded-md bg-[color-mix(in_oklab,var(--ok)_15%,transparent)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--ok)] uppercase">
                          melhor
                        </span>
                      )}
                      {b.brand}
                    </td>
                    <td className="mono px-5 py-3 text-sm text-[var(--text-2)]">{b.count}</td>
                    <td className="mono px-5 py-3 text-sm text-[var(--text-2)]">
                      {b.kmWithData > 0 ? b.kmWithData.toLocaleString("pt-BR") : "—"}
                    </td>
                    <td className="mono px-5 py-3 text-sm text-[var(--text-2)]">
                      {b.costWithData > 0 ? money(b.costWithData) : "—"}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <span className="mono text-sm font-bold text-[var(--text)]">
                          {cpkFmt(b.cpk)}
                        </span>
                        {b.cpk != null && maxCpk > 0 && (
                          <span className="cpk-bar">
                            <span
                              className="cpk-bar-fill"
                              style={{ width: `${Math.max((b.cpk / maxCpk) * 100, 6)}%` }}
                            />
                          </span>
                        )}
                      </div>
                    </td>
                    <td />
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <p className="mt-3 text-xs text-[var(--text-3)]">
          CPK = custo total (compra + recapagens + consertos) ÷ km rodada, ponderado por marca.
          Quanto menor, melhor o pneu. O número afina conforme os pneus completam suas vidas e
          recebem aferições com km.
        </p>
      </section>

      {/* Decisão de compra */}
      <section className="mb-8">
        <div className="cmd-section-head">
          <span className="cmd-section-ico">
            <ShoppingCart size={20} />
          </span>
          <h2 className="cmd-section-title" style={{ fontSize: 22 }}>
            Decisão: recapar ou comprar
          </h2>
          <span className="cmd-section-rule" />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <DecisionCard
            icon={<RotateCcw size={18} />}
            title="Recapar"
            subtitle={`carcaça ainda boa (até a ${MAX_RECAP_LIVES}ª vida)`}
            tone="ok"
            tires={a.decision.recap}
          />
          <DecisionCard
            icon={<ShoppingCart size={18} />}
            title="Comprar novo"
            subtitle={`carcaça no fim (${MAX_RECAP_LIVES}ª vida ou mais)`}
            tone="warn"
            tires={a.decision.buy}
          />
        </div>
        <p className="mt-3 text-xs text-[var(--text-3)]">
          Pneus montados com sulco abaixo de {mm(thresholds.okMm)} entram aqui. A sugestão (recapar
          ou comprar) é pela vida da carcaça — a decisão final é sua.
        </p>
      </section>

      {/* Vidas */}
      <section className="mb-8">
        <div className="cmd-section-head">
          <span className="cmd-section-ico">
            <Layers size={20} />
          </span>
          <h2 className="cmd-section-title" style={{ fontSize: 22 }}>
            Reaproveitamento de carcaça
          </h2>
          <span className="cmd-section-rule" />
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[
            ["1ª vida (novo)", a.lives.l1],
            ["2ª vida (1 recap.)", a.lives.l2],
            ["3ª vida ou mais", a.lives.l3plus],
          ].map(([label, n]) => (
            <div key={label as string} className="glass rounded-2xl p-4">
              <div className="text-[11px] font-bold tracking-[0.1em] text-[var(--text-3)] uppercase">
                {label}
              </div>
              <div className="mono mt-1 text-2xl font-bold text-[var(--text)]">{n}</div>
            </div>
          ))}
        </div>
        {a.fleet.avgWearPer1000 != null && (
          <p className="mt-3 text-xs text-[var(--text-3)]">
            Desgaste médio observado: ~{a.fleet.avgWearPer1000.toFixed(2).replace(".", ",")} mm a
            cada 1.000 km.
          </p>
        )}
      </section>
    </>
  );
}

function DecisionCard({
  icon,
  title,
  subtitle,
  tone,
  tires,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  tone: "ok" | "warn";
  tires: Awaited<ReturnType<typeof getTireAnalytics>>["decision"]["recap"];
}) {
  return (
    <div className="glass rounded-3xl p-5">
      <div className="mb-3 flex items-center gap-3">
        <span
          className="grid size-9 place-items-center rounded-xl"
          style={{
            background: `color-mix(in oklab, var(--${tone}) 14%, transparent)`,
            color: `var(--${tone})`,
          }}
        >
          {icon}
        </span>
        <div>
          <div className="font-bold text-[var(--text)]">
            {title} <span className="mono text-[var(--text-3)]">· {tires.length}</span>
          </div>
          <div className="text-xs text-[var(--text-3)]">{subtitle}</div>
        </div>
      </div>
      {tires.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--border)] px-4 py-6 text-center text-sm text-[var(--text-3)]">
          Nenhum pneu nesta condição.
        </div>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {tires.map((t) => (
            <li
              key={t.tireId}
              className="flex items-center gap-3 rounded-xl border border-[var(--border)] px-3 py-2"
            >
              <Link
                href={`/pneus/${t.tireId}`}
                className="mono grid size-9 place-items-center rounded-lg bg-[var(--panel-solid)] text-xs font-bold text-[var(--text)] hover:text-[var(--brand-amber)]"
              >
                {t.fireNumber}
              </Link>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-[var(--text)]">
                  {t.brand ?? "Sem marca"} · <span className="mono">{t.size}</span>
                </div>
                <div className="text-xs text-[var(--text-3)]">
                  {t.vehicleId ? (
                    <Link
                      href={`/frota/${t.vehicleId}`}
                      className="mono hover:text-[var(--brand-amber)]"
                    >
                      {t.vehiclePlate} · {t.position}
                    </Link>
                  ) : (
                    "—"
                  )}{" "}
                  · {t.life}ª vida
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <span className={`dot ${t.tone}`} />
                <span className="mono text-sm font-semibold text-[var(--text)]">
                  {mm(t.treadMm)}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
