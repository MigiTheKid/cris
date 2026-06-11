"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { saveTireThresholds } from "@/lib/actions/settings";
import type { TireThresholds } from "@/lib/tires";

const field = "flex flex-col gap-1.5";
const labelCls = "text-xs font-bold text-[var(--text-2)]";
const inputCls =
  "h-11 w-28 rounded-xl border border-[var(--border)] bg-[var(--panel-solid)] px-3 text-sm text-[var(--text)] outline-none focus:border-[var(--brand-amber)] focus:ring-4 focus:ring-[color-mix(in_oklab,var(--brand-amber)_18%,transparent)]";

function parse(v: string): number | null {
  const n = Number(v.trim().replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

/** Form dos limiares de sulco, com prévia ao vivo da régua de cores. */
export function TireThresholdsForm({ initial }: { initial: TireThresholds }) {
  const router = useRouter();
  const [okStr, setOkStr] = useState(String(initial.okMm).replace(".", ","));
  const [recapStr, setRecapStr] = useState(String(initial.recapMm).replace(".", ","));
  const [saved, setSaved] = useState(false);
  const [state, formAction, pending] = useActionState(saveTireThresholds, {});

  useEffect(() => {
    if (state.ok) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSaved(true);
      router.refresh();
      const t = setTimeout(() => setSaved(false), 2500);
      return () => clearTimeout(t);
    }
  }, [state.ok, router]);

  const ok = parse(okStr) ?? initial.okMm;
  const recap = parse(recapStr) ?? initial.recapMm;
  const fmt = (n: number) => String(n).replace(".", ",");

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-4">
        <div className={field}>
          <label htmlFor="th-ok" className={labelCls}>
            Em dia a partir de (mm)
          </label>
          <input
            id="th-ok"
            name="okMm"
            inputMode="decimal"
            value={okStr}
            onChange={(e) => setOkStr(e.target.value)}
            className={inputCls}
            required
          />
        </div>
        <div className={field}>
          <label htmlFor="th-recap" className={labelCls}>
            Retirar abaixo de (mm)
          </label>
          <input
            id="th-recap"
            name="recapMm"
            inputMode="decimal"
            value={recapStr}
            onChange={(e) => setRecapStr(e.target.value)}
            className={inputCls}
            required
          />
        </div>
        <button type="submit" className="cbtn primary" disabled={pending} style={{ height: 44 }}>
          {pending ? (
            "Salvando…"
          ) : saved ? (
            <>
              Salvo <Check size={15} />
            </>
          ) : (
            "Salvar"
          )}
        </button>
      </div>

      {/* Prévia ao vivo da régua */}
      <div className="rodado-legend" aria-live="polite">
        <div>
          <span className="dot ok" /> Sulco ≥ {fmt(ok)} mm — em uso normal
        </div>
        <div>
          <span className="dot warn" /> {fmt(recap)}–{fmt(ok)} mm — janela de recapagem
        </div>
        <div>
          <span className="dot crit" /> &lt; {fmt(recap)} mm — retirar (legal: 1,6 mm)
        </div>
      </div>

      {state.error && (
        <div className="rounded-xl border border-[color-mix(in_oklab,var(--crit)_30%,transparent)] bg-[color-mix(in_oklab,var(--crit)_12%,transparent)] px-3 py-2 text-sm font-semibold text-[var(--crit)]">
          {state.error}
        </div>
      )}
    </form>
  );
}
