import type { StatusTone } from "@/lib/status";

const SEGMENTS: { tone: StatusTone; label: string; varName: string }[] = [
  { tone: "ok", label: "Em dia", varName: "--ok" },
  { tone: "warn", label: "Atenção", varName: "--warn" },
  { tone: "alert", label: "Alerta", varName: "--alert" },
  { tone: "crit", label: "Crítico", varName: "--crit" },
  { tone: "idle", label: "Sem data", varName: "--idle" },
];

/** Medidor radial segmentado da saúde da frota (donut por status). */
export function HealthGauge({
  counts,
  total,
  conformidadePct,
}: {
  counts: Record<StatusTone, number>;
  total: number;
  conformidadePct: number;
}) {
  // Monta os stops do conic-gradient proporcionais à contagem.
  let acc = 0;
  const stops: string[] = [];
  for (const s of SEGMENTS) {
    const n = counts[s.tone];
    if (n <= 0) continue;
    const start = (acc / total) * 360;
    acc += n;
    const end = (acc / total) * 360;
    stops.push(`var(${s.varName}) ${start}deg ${end}deg`);
  }
  const ring = total > 0 ? `conic-gradient(${stops.join(", ")})` : "var(--idle)";

  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:gap-8">
      <div className="gauge-ring" style={{ background: ring }}>
        <div className="gauge-hole">
          <span className="gauge-pct mono">{conformidadePct}%</span>
          <span className="gauge-cap">em conformidade</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-7 gap-y-3">
        {SEGMENTS.filter((s) => counts[s.tone] > 0 || s.tone !== "idle").map((s) => (
          <div key={s.tone} className="flex items-center gap-2.5">
            <span className={`dot ${s.tone}`} />
            <span className="mono text-lg font-semibold text-[var(--text)]">{counts[s.tone]}</span>
            <span className="text-sm text-[var(--text-3)]">{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
