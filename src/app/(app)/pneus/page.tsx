import Link from "next/link";
import { Plus, Disc, ChevronRight } from "lucide-react";
import { getTireList } from "@/lib/data/tires";
import { getTireThresholds } from "@/lib/data/settings";
import { TIRE_STATUS_LABEL } from "@/lib/tires";
import { StatusBadge } from "@/components/cris/StatusBadge";
import { TireDialog } from "@/components/cris/TireDialog";

export const dynamic = "force-dynamic";

const STATUS_DOT: Record<string, string> = {
  em_uso: "ok",
  estoque: "idle",
  recapagem: "warn",
  conserto: "warn",
  sucateado: "crit",
  vendido: "idle",
};

export default async function PneusPage() {
  const [tires, thresholds] = await Promise.all([getTireList(), getTireThresholds()]);

  const emUso = tires.filter((t) => t.status === "em_uso").length;
  const estoque = tires.filter((t) => t.status === "estoque");
  const fora = tires.filter((t) => t.status === "recapagem" || t.status === "conserto").length;
  const criticos = tires.filter((t) => t.status === "em_uso" && t.treadTone === "crit").length;

  // Estoque agrupado por medida (como a planilha original fazia).
  const stockBySize = [
    ...estoque.reduce((m, t) => m.set(t.size, (m.get(t.size) ?? 0) + 1), new Map<string, number>()),
  ].sort((a, b) => b[1] - a[1]);

  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">◎ Pneus</div>
          <h1 className="page-title">Pneus</h1>
          <p className="page-sub">
            {tires.length} pneus · {emUso} em uso · {estoque.length} em estoque
            {fora > 0 ? ` · ${fora} fora (recape/conserto)` : ""}
          </p>
        </div>
        <div className="page-actions">
          <TireDialog
            trigger={
              <button className="cbtn primary">
                <Plus size={16} strokeWidth={2.2} /> Novo pneu
              </button>
            }
          />
        </div>
      </div>

      {/* KPIs */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="glass rounded-2xl p-4">
          <div className="text-[11px] font-bold tracking-[0.1em] text-[var(--text-3)] uppercase">
            Em uso
          </div>
          <div className="mono mt-1 text-2xl font-bold text-[var(--text)]">{emUso}</div>
        </div>
        <div className="glass rounded-2xl p-4">
          <div className="text-[11px] font-bold tracking-[0.1em] text-[var(--text-3)] uppercase">
            Críticos (&lt; {String(thresholds.recapMm).replace(".", ",")} mm)
          </div>
          <div
            className="mono mt-1 text-2xl font-bold"
            style={{ color: criticos > 0 ? "var(--crit)" : "var(--text)" }}
          >
            {criticos}
          </div>
        </div>
        <div className="glass rounded-2xl p-4">
          <div className="text-[11px] font-bold tracking-[0.1em] text-[var(--text-3)] uppercase">
            Em estoque
          </div>
          <div className="mono mt-1 text-2xl font-bold text-[var(--text)]">{estoque.length}</div>
          <div className="mt-1 text-xs text-[var(--text-3)]">
            {stockBySize.map(([size, n]) => `${n}× ${size}`).join(" · ") || "—"}
          </div>
        </div>
        <div className="glass rounded-2xl p-4">
          <div className="text-[11px] font-bold tracking-[0.1em] text-[var(--text-3)] uppercase">
            Recape / conserto
          </div>
          <div className="mono mt-1 text-2xl font-bold text-[var(--text)]">{fora}</div>
        </div>
      </div>

      <div className="glass overflow-hidden rounded-3xl">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="text-[var(--text-3)]">
              {["Fogo", "Pneu", "Medida", "Vida", "Sulco", "Onde está", "Situação", ""].map(
                (h, i) => (
                  <th
                    key={i}
                    className="border-b border-[var(--border)] px-5 py-3.5 text-[11px] font-bold tracking-[0.12em] uppercase"
                  >
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {tires.map((t) => (
              <tr
                key={t.id}
                className="border-b border-[var(--border)] transition-colors last:border-0 hover:bg-[var(--hover)]"
                style={{ opacity: t.status === "sucateado" || t.status === "vendido" ? 0.5 : 1 }}
              >
                <td className="mono px-5 py-3 text-base font-bold text-[var(--text)]">
                  {t.fireNumber}
                </td>
                <td className="px-5 py-3 text-sm text-[var(--text-2)]">
                  {[t.brand, t.model].filter(Boolean).join(" ") || "—"}
                </td>
                <td className="mono px-5 py-3 text-sm text-[var(--text-2)]">{t.size}</td>
                <td className="mono px-5 py-3 text-sm text-[var(--text-2)]">{t.life}ª</td>
                <td className="px-5 py-3">
                  {t.treadMm != null ? (
                    <span className="inline-flex items-center gap-2">
                      <span className={`dot ${t.treadTone}`} />
                      <span className="mono text-sm font-semibold text-[var(--text)]">
                        {String(t.treadMm).replace(".", ",")} mm
                      </span>
                    </span>
                  ) : (
                    <span className="text-sm text-[var(--text-3)]">—</span>
                  )}
                </td>
                <td className="px-5 py-3">
                  {t.vehicleId ? (
                    <Link
                      href={`/frota/${t.vehicleId}`}
                      className="mono text-sm font-semibold text-[var(--text)] hover:text-[var(--brand-amber)]"
                    >
                      {t.vehiclePlate} · {t.position}
                    </Link>
                  ) : (
                    <span className="text-sm text-[var(--text-3)]">
                      {TIRE_STATUS_LABEL[t.status]}
                    </span>
                  )}
                </td>
                <td className="px-5 py-3">
                  <StatusBadge
                    tone={(STATUS_DOT[t.status] ?? "idle") as "ok" | "warn" | "crit" | "idle"}
                    label={t.statusLabel}
                  />
                </td>
                <td className="px-5 py-3 text-right">
                  {t.vehicleId && (
                    <Link
                      href={`/frota/${t.vehicleId}`}
                      className="inline-flex"
                      aria-label={`Ver no veículo ${t.vehiclePlate}`}
                    >
                      <ChevronRight
                        size={18}
                        className="text-[var(--text-3)] transition-colors hover:text-[var(--brand-amber)]"
                      />
                    </Link>
                  )}
                </td>
              </tr>
            ))}
            {tires.length === 0 && (
              <tr>
                <td colSpan={8} className="px-5 py-16 text-center text-[var(--text-3)]">
                  <Disc size={32} className="mx-auto mb-3 opacity-50" />
                  Nenhum pneu cadastrado ainda. Comece pelo botão “Novo pneu”.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
