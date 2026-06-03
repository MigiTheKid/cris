"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, AlertTriangle, RefreshCw } from "lucide-react";
import type { AlertItem } from "@/lib/data/command";

/** Ação agora — mini-carrossel de documentos críticos. */
export function ActionNow({ alerts }: { alerts: AlertItem[] }) {
  const [i, setI] = useState(0);
  const n = alerts.length;

  if (n === 0) {
    return (
      <div className="bento-card cmd-action cmd-in ci-3">
        <div className="aa-head">
          <span className="aa-eyebrow">
            <span className="dot ok live" /> Ação agora
          </span>
        </div>
        <div className="aa-item">
          <div className="aa-doc">Tudo em dia</div>
          <div className="aa-model">Nenhum documento crítico no momento. 🎉</div>
        </div>
      </div>
    );
  }

  const idx = ((i % n) + n) % n;
  const a = alerts[idx];
  const daysTxt = a.days < 0 ? `vencido há ${Math.abs(a.days)} dias` : `vence em ${a.days} dias`;

  return (
    <div className="bento-card cmd-action cmd-in ci-3">
      <div className="aa-head">
        <span className="aa-eyebrow">
          <span className="dot crit live" /> Ação agora
        </span>
        <div className="aa-nav">
          <button onClick={() => setI(idx - 1)} aria-label="Anterior">
            <ChevronLeft size={16} />
          </button>
          <span className="aa-count">
            <b>{String(idx + 1).padStart(2, "0")}</b> / {String(n).padStart(2, "0")}
          </span>
          <button onClick={() => setI(idx + 1)} aria-label="Próximo">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="aa-item" key={idx}>
        <div className="aa-doc">{a.docLabel}</div>
        <div className="aa-plate">{a.plate}</div>
        <div className="aa-model">
          {a.model ?? "—"} · {a.typeLabel}
        </div>
        <span className="aa-status">
          <span className="aa-sym">
            <AlertTriangle size={18} />
          </span>
          {daysTxt}
        </span>
      </div>

      <div className="aa-cta">
        <div className="aa-dots">
          {alerts.map((_, k) => (
            <i key={k} className={k === idx ? "on" : ""} onClick={() => setI(k)} />
          ))}
        </div>
        <Link href="/frota" className="cbtn primary" style={{ width: "100%", height: 56 }}>
          <RefreshCw size={18} /> Resolver agora
        </Link>
      </div>
    </div>
  );
}
