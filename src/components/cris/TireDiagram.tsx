"use client";

import type { RodadoAxle, RodadoPosition } from "@/lib/data/tires";
import type { StatusTone } from "@/lib/status";

export type DiagramUnit = {
  plate: string;
  role: "tractor" | "trailer" | "single";
  axles: RodadoAxle[];
};

export type DiagramSelection = { unitIndex: number; code: string } | null;

const TONE_COLOR: Record<StatusTone, string> = {
  ok: "var(--ok)",
  warn: "var(--warn)",
  alert: "var(--alert)",
  crit: "var(--crit)",
  idle: "var(--idle)",
};

// Geometria (viewBox 320 de largura, eixo Y cresce conforme as unidades).
const W = 320;
const CX = W / 2;
const TIRE_W = 27;
const TIRE_H = 44;
const AXLE_GAP = 70;
const X_SINGLE = { E: 58, D: 235 };
const X_DUAL = { EE: 26, EI: 56, DI: 237, DE: 267 };

function tireX(pos: RodadoPosition): number {
  if (pos.dualPos) return X_DUAL[`${pos.side}${pos.dualPos}` as keyof typeof X_DUAL];
  return X_SINGLE[pos.side];
}

function Tire({
  pos,
  y,
  selected,
  onSelect,
}: {
  pos: RodadoPosition;
  y: number;
  selected: boolean;
  onSelect: () => void;
}) {
  const x = tireX(pos);
  const tone = pos.tire ? pos.tire.tone : null;
  const color = tone ? TONE_COLOR[tone] : "var(--border-strong)";
  return (
    <g onClick={onSelect} style={{ cursor: "pointer" }}>
      <rect
        x={x}
        y={y - TIRE_H / 2}
        width={TIRE_W}
        height={TIRE_H}
        rx={7}
        fill={
          pos.tire
            ? `color-mix(in oklab, ${color} ${selected ? 34 : 20}%, var(--panel-solid))`
            : "transparent"
        }
        stroke={color}
        strokeWidth={selected ? 3 : 1.6}
        strokeDasharray={pos.tire ? undefined : "5 4"}
      />
      <text
        x={x + TIRE_W / 2}
        y={y + 4}
        textAnchor="middle"
        style={{
          fontSize: 11,
          fontFamily: "var(--font-mono)",
          fill: pos.tire ? "var(--text)" : "var(--text-3)",
          fontWeight: 700,
        }}
      >
        {pos.tire ? pos.tire.fireNumber : "+"}
      </text>
    </g>
  );
}

/**
 * Diagrama do rodado (visto de cima). Desenha 1 ou 2 unidades (conjunto):
 * cavalo em cima, reboque embaixo, engate entre eles. Gerado do layout de eixos.
 */
export function TireDiagram({
  units,
  selection,
  onSelect,
}: {
  units: DiagramUnit[];
  selection: DiagramSelection;
  onSelect: (unitIndex: number, pos: RodadoPosition) => void;
}) {
  // Layout vertical: calcula as alturas de cada unidade (loop simples — sem
  // mutação dentro de callback, exigência do React Compiler).
  const layout: { unit: DiagramUnit; top: number; axleTop: number }[] = [];
  let y = 10;
  for (let idx = 0; idx < units.length; idx++) {
    const unit = units[idx];
    const headH = unit.role === "tractor" || unit.role === "single" ? 54 : 30;
    const top = y;
    const axleTop = top + headH + 26;
    y += headH + 26 + Math.max(unit.axles.length - 1, 0) * AXLE_GAP + 56;
    if (idx < units.length - 1) y += 52; // espaço do engate
    layout.push({ unit, top, axleTop });
  }
  const totalH = y + 6;

  return (
    <svg
      viewBox={`0 0 ${W} ${totalH}`}
      style={{ width: "100%", display: "block" }}
      role="img"
      aria-label="Diagrama do rodado com situação de cada pneu"
    >
      {layout.map(({ unit, top, axleTop }, unitIndex) => {
        const axleYs = unit.axles.map((_, i) => axleTop + i * AXLE_GAP);
        const lastY = axleYs.length > 0 ? axleYs[axleYs.length - 1] : axleTop;
        const chassisTop = top + (unit.role === "trailer" ? 30 : 54) + 4;
        return (
          <g key={unitIndex}>
            {/* cabine (unidade motora) ou frente do implemento */}
            {unit.role !== "trailer" ? (
              <rect
                x={CX - 36}
                y={top}
                width={72}
                height={50}
                rx={10}
                fill="var(--hover)"
                stroke="var(--border-strong)"
              />
            ) : null}
            <text
              x={CX}
              y={top + (unit.role !== "trailer" ? 30 : 18)}
              textAnchor="middle"
              style={{
                fontSize: 12,
                fontFamily: "var(--font-mono)",
                fontWeight: 700,
                fill: "var(--text-2)",
              }}
            >
              {unit.plate}
            </text>
            {/* chassi */}
            <rect
              x={unit.role === "trailer" ? CX - 22 : CX - 14}
              y={chassisTop}
              width={unit.role === "trailer" ? 44 : 28}
              height={lastY - chassisTop + 34}
              rx={unit.role === "trailer" ? 14 : 5}
              fill="var(--hover)"
              stroke="var(--border)"
            />
            {/* eixos + pneus */}
            {unit.axles.map((axle, i) => {
              const ay = axleYs[i];
              const minX = axle.dual ? X_DUAL.EE : X_SINGLE.E;
              const maxX = (axle.dual ? X_DUAL.DE : X_SINGLE.D) + TIRE_W;
              return (
                <g key={axle.number}>
                  <line
                    x1={minX + 8}
                    y1={ay}
                    x2={maxX - 8}
                    y2={ay}
                    stroke="var(--border-strong)"
                    strokeWidth={5}
                  />
                  {axle.positions.map((pos) => (
                    <Tire
                      key={pos.code}
                      pos={pos}
                      y={ay}
                      selected={selection?.unitIndex === unitIndex && selection?.code === pos.code}
                      onSelect={() => onSelect(unitIndex, pos)}
                    />
                  ))}
                </g>
              );
            })}
            {/* engate até a próxima unidade */}
            {unitIndex < layout.length - 1 && (
              <g>
                <line
                  x1={CX}
                  y1={lastY + 36}
                  x2={CX}
                  y2={lastY + 80}
                  stroke="var(--brand-amber)"
                  strokeWidth={3}
                  strokeDasharray="6 4"
                />
                <circle
                  cx={CX}
                  cy={lastY + 58}
                  r={10}
                  fill="none"
                  stroke="var(--brand-amber)"
                  strokeWidth={2.5}
                />
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );
}
