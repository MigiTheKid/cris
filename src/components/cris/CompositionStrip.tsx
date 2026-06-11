import Link from "next/link";
import { Truck, Container, Link2, User } from "lucide-react";
import { StatusBadge } from "./StatusBadge";
import type { StatusTone } from "@/lib/status";

export type CompositionUnitView = {
  id: string | null; // null = é a página atual (não vira link)
  plate: string;
  model: string | null;
  tone: StatusTone;
  statusLabel: string;
};

function UnitCard({ unit, kind }: { unit: CompositionUnitView; kind: "tractor" | "trailer" }) {
  const Ico = kind === "tractor" ? Truck : Container;
  const body = (
    <>
      <span className="comp-ico">
        <Ico size={22} />
      </span>
      <span className="comp-main">
        <span className="comp-plate mono">{unit.plate}</span>
        <span className="comp-model">
          {unit.model ?? (kind === "tractor" ? "Cavalo mecânico" : "Semirreboque")}
        </span>
        <StatusBadge tone={unit.tone} label={unit.statusLabel} />
      </span>
    </>
  );
  if (unit.id) {
    return (
      <Link href={`/frota/${unit.id}`} className="comp-unit link">
        {body}
      </Link>
    );
  }
  return <div className="comp-unit current">{body}</div>;
}

function EmptySlot({ kind }: { kind: "tractor" | "trailer" }) {
  const Ico = kind === "tractor" ? Truck : Container;
  return (
    <div className="comp-unit empty">
      <span className="comp-ico">
        <Ico size={22} />
      </span>
      <span className="comp-main">
        <span className="comp-plate">—</span>
        <span className="comp-model">
          {kind === "tractor" ? "Sem cavalo engatado" : "Sem reboque engatado"}
        </span>
      </span>
    </div>
  );
}

/**
 * Faixa de composição: cavalo ⇄ reboque como "vagões" conectados.
 * O conjunto é derivado — quem dirige o cavalo conduz a composição inteira.
 */
export function CompositionStrip({
  tractor,
  trailer,
  driverName,
}: {
  tractor: CompositionUnitView | null;
  trailer: CompositionUnitView | null;
  driverName: string | null;
}) {
  const linked = !!(tractor && trailer);
  return (
    <div className="comp-strip">
      <div className="comp-row">
        {tractor ? <UnitCard unit={tractor} kind="tractor" /> : <EmptySlot kind="tractor" />}
        <span className={linked ? "comp-link on" : "comp-link"}>
          <Link2 size={18} />
          <span className="comp-link-label">{linked ? "engatado" : "sem engate"}</span>
        </span>
        {trailer ? <UnitCard unit={trailer} kind="trailer" /> : <EmptySlot kind="trailer" />}
      </div>
      {driverName && (
        <div className="comp-driver">
          <User size={14} /> <strong>{driverName}</strong> conduz o conjunto
        </div>
      )}
    </div>
  );
}
