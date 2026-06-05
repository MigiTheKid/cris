import { Truck } from "lucide-react";
import { Avatar } from "./Avatar";
import type { FleetCardItem } from "@/lib/data/command";

/** Card cinematográfico de veículo (usado no Coverflow do Painel). */
export function FleetCard({ v }: { v: FleetCardItem }) {
  return (
    <div className="cine-card">
      <div style={{ position: "relative" }}>
        <div className="thumb" style={{ height: 180 }}>
          <div className="thumb-ph">
            <Truck size={30} />
            <span className="mono">foto do veículo</span>
          </div>
          <div className="cine-photo-over" />
        </div>
        <div className="cine-top">
          <span className="cine-comp">{v.companyLabel}</span>
          <span className="cine-light">
            <span className={v.tone === "crit" ? `dot ${v.tone} live` : `dot ${v.tone}`} />
            {v.statusLabel}
          </span>
        </div>
        <div className="cine-plate-over">
          <div className="p">{v.plate}</div>
        </div>
      </div>
      <div className="cine-body">
        <div className="cine-model">{v.model ?? "—"}</div>
        <div className="cine-meta">
          {v.typeLabel}
          {v.year ? ` · ${v.year}` : ""}
        </div>
        <div className="cine-foot">
          <span className="who">
            {v.driverName ? (
              <>
                <Avatar name={v.driverName} size={22} />
                <span>{v.driverName}</span>
              </>
            ) : (
              <span style={{ color: "var(--text-3)" }}>sem motorista</span>
            )}
          </span>
          <span className="stat">
            {v.critCount > 0 ? (
              <span className="inline-flex items-center gap-1.5">
                <span className="dot crit" />
                {v.critCount} crítico{v.critCount > 1 ? "s" : ""}
              </span>
            ) : v.attnCount > 0 ? (
              <span className="inline-flex items-center gap-1.5">
                <span className="dot warn" />
                {v.attnCount} atenção
              </span>
            ) : v.docTotal > 0 ? (
              <span className="inline-flex items-center gap-1.5">
                <span className="dot ok" />
                {v.docTotal}/{v.docTotal} ok
              </span>
            ) : (
              <span style={{ color: "var(--text-3)" }}>sem documentos</span>
            )}
          </span>
        </div>
      </div>
    </div>
  );
}
