"use client";

import { useEffect, useState } from "react";
import type { StatusTone } from "@/lib/status";

function useCountUp(target: number, dur = 1100) {
  const [v, setV] = useState(target);
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    let start: number | null = null;
    const step = (ts: number) => {
      if (start === null) start = ts;
      const p = reduce ? 1 : Math.min(1, (ts - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setV(Math.round(target * eased));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, dur]);
  return v;
}

const COLOR: Record<StatusTone, string> = {
  ok: "var(--ok)",
  warn: "var(--warn)",
  alert: "var(--alert)",
  crit: "var(--crit)",
  idle: "var(--idle)",
};

/** Medidor radial segmentado (arcos por status) + glow giratório + count-up. */
export function Gauge({
  pct,
  segments,
  total,
}: {
  pct: number;
  segments: { tone: StatusTone; count: number }[];
  total: number;
}) {
  const R = 84;
  const C = 2 * Math.PI * R;
  const shown = useCountUp(pct);

  let acc = 0;
  const arcs = segments
    .filter((s) => s.count > 0)
    .map((s) => {
      const len = (C * s.count) / total;
      const seg = Math.max(2, len - 16);
      const el = (
        <circle
          key={s.tone}
          cx="100"
          cy="100"
          r={R}
          fill="none"
          strokeWidth="12"
          strokeLinecap="round"
          stroke={COLOR[s.tone]}
          strokeDasharray={`${seg} ${C - seg}`}
          strokeDashoffset={-acc}
        />
      );
      acc += len;
      return el;
    });

  return (
    <div className="gauge">
      <div className="gauge-spin" />
      <svg width="240" height="240" viewBox="0 0 200 200">
        <circle className="gauge-track" cx="100" cy="100" r={R} fill="none" strokeWidth="12" />
        {total > 0 && arcs}
      </svg>
      <div className="gauge-center">
        <div className="gauge-num">
          {shown}
          <span className="pct">%</span>
        </div>
        <div className="gauge-cap">em conformidade</div>
      </div>
    </div>
  );
}
