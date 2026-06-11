import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ChevronLeft,
  Disc,
  ArrowDownToLine,
  ArrowUpFromLine,
  Ruler,
  RotateCcw,
  Wrench,
  Trash2,
  ShoppingCart,
  Banknote,
} from "lucide-react";
import { getTireDetail } from "@/lib/data/tires";
import { StatusBadge } from "@/components/cris/StatusBadge";

export const dynamic = "force-dynamic";

const KIND_META: Record<string, { icon: typeof Disc; dot: string }> = {
  instalacao: { icon: ArrowDownToLine, dot: "ok" },
  remocao: { icon: ArrowUpFromLine, dot: "idle" },
  afericao: { icon: Ruler, dot: "warn" },
  recapagem: { icon: RotateCcw, dot: "ok" },
  conserto: { icon: Wrench, dot: "warn" },
  sucateamento: { icon: Trash2, dot: "crit" },
  venda: { icon: Banknote, dot: "idle" },
  compra: { icon: ShoppingCart, dot: "ok" },
};

function fmtDate(iso: string) {
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

function fmtMoney(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtMm(v: number | null) {
  return v != null ? `${String(v).replace(".", ",")} mm` : "—";
}

export default async function TireDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tire = await getTireDetail(id);
  if (!tire) notFound();

  return (
    <>
      <div className="vd-back cmd-in ci-1">
        <Link href="/pneus" className="cbtn ghost" style={{ height: 36, padding: "0 13px" }}>
          <ChevronLeft size={16} /> Pneus
        </Link>
      </div>

      {/* Hero do pneu */}
      <div className="glass cmd-in ci-2 mb-6 rounded-3xl p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="grid size-16 place-items-center rounded-2xl bg-[color-mix(in_oklab,var(--brand-teal)_10%,transparent)] text-[var(--brand-teal)]">
              <Disc size={30} />
            </span>
            <div>
              <div className="flex items-baseline gap-3">
                <h1 className="page-title" style={{ margin: 0 }}>
                  <span className="text-[var(--text-3)]">Fogo</span>{" "}
                  <span className="mono">{tire.fireNumber}</span>
                </h1>
                <StatusBadge
                  tone={tire.status === "em_uso" ? tire.tone : "idle"}
                  label={tire.statusLabel}
                />
              </div>
              <p className="page-sub" style={{ margin: "4px 0 0" }}>
                {[tire.brand, tire.model].filter(Boolean).join(" ") || "Sem marca"} ·{" "}
                <span className="mono">{tire.size}</span> · {tire.life}ª vida
                {tire.vehiclePlate && (
                  <>
                    {" "}
                    · em{" "}
                    <Link
                      href={`/frota/${tire.vehicleId}`}
                      className="mono font-semibold text-[var(--text)] hover:text-[var(--brand-amber)]"
                    >
                      {tire.vehiclePlate} {tire.position}
                    </Link>
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-2xl bg-[var(--panel-solid)] px-4 py-3">
              <div className="text-[10px] font-bold tracking-[0.1em] text-[var(--text-3)] uppercase">
                Sulco atual
              </div>
              <div className="mono mt-0.5 text-lg font-bold text-[var(--text)]">
                {fmtMm(tire.treadMm)}
                {tire.treadNewMm != null && (
                  <span className="text-xs font-semibold text-[var(--text-3)]">
                    {" "}
                    / {fmtMm(tire.treadNewMm)}
                  </span>
                )}
              </div>
            </div>
            <div className="rounded-2xl bg-[var(--panel-solid)] px-4 py-3">
              <div className="text-[10px] font-bold tracking-[0.1em] text-[var(--text-3)] uppercase">
                Km registrada
              </div>
              <div className="mono mt-0.5 text-lg font-bold text-[var(--text)]">
                {tire.kmTracked > 0 ? tire.kmTracked.toLocaleString("pt-BR") : "—"}
              </div>
            </div>
            <div className="rounded-2xl bg-[var(--panel-solid)] px-4 py-3">
              <div className="text-[10px] font-bold tracking-[0.1em] text-[var(--text-3)] uppercase">
                Custo acumulado
              </div>
              <div className="mono mt-0.5 text-lg font-bold text-[var(--text)]">
                {tire.totalCost > 0 ? fmtMoney(tire.totalCost) : "—"}
              </div>
            </div>
            <div className="rounded-2xl bg-[var(--panel-solid)] px-4 py-3">
              <div className="text-[10px] font-bold tracking-[0.1em] text-[var(--text-3)] uppercase">
                Aferições
              </div>
              <div className="mono mt-0.5 text-lg font-bold text-[var(--text)]">
                {tire.readings.length}
              </div>
            </div>
          </div>
        </div>
        {tire.notes && <p className="mt-4 text-sm text-[var(--text-2)]">📝 {tire.notes}</p>}
      </div>

      {/* Linha da vida */}
      <div className="cmd-in ci-3">
        <div className="cmd-section-head">
          <h2 className="cmd-section-title" style={{ fontSize: 20 }}>
            Linha da vida
          </h2>
          <span className="cmd-section-count">{tire.timeline.length}</span>
          <span className="cmd-section-rule" />
        </div>

        <div className="glass rounded-3xl p-2 sm:p-4">
          {tire.timeline.length > 0 ? (
            <ol className="audit-list">
              {tire.timeline.map((e, i) => {
                const meta = KIND_META[e.kind] ?? { icon: Disc, dot: "idle" };
                const Ico = meta.icon;
                return (
                  <li key={i} className="audit-row">
                    <span className="audit-ico">
                      <Ico size={15} />
                      <span className={`dot ${meta.dot}`} />
                    </span>
                    <div className="audit-main">
                      <div className="audit-text">
                        <strong>{e.title}</strong>
                        {e.detail && <span className="audit-obj"> · {e.detail}</span>}
                        {e.cost != null && <span className="audit-obj"> · {fmtMoney(e.cost)}</span>}
                      </div>
                      <time className="audit-time mono">{fmtDate(e.date)}</time>
                    </div>
                  </li>
                );
              })}
            </ol>
          ) : (
            <div className="px-4 py-10 text-center text-sm text-[var(--text-3)]">
              Nenhum evento registrado ainda.
            </div>
          )}
        </div>
      </div>
    </>
  );
}
