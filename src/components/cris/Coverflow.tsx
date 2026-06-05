"use client";

import { Children, useRef, useState, type ReactNode, type CSSProperties } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

// Tiers por |offset|: 2 centrais planos/opacos, 2 laterais girados em 3D, 1 buffer.
const TIERS = [
  { x: 0, s: 1.0, op: 1.0, z: 0, ry: 0, zi: 50 },
  { x: 336, s: 1.0, op: 1.0, z: 0, ry: 0, zi: 40 }, // stepX = 320 + 16
  { x: 454, s: 0.86, op: 0.55, z: -90, ry: 38, zi: 24 },
  { x: 546, s: 0.72, op: 0.28, z: -170, ry: 46, zi: 12 },
  { x: 606, s: 0.64, op: 0.0, z: -230, ry: 50, zi: 6 },
];

/**
 * Coverflow 3D infinito (frota & motoristas). Portado do design handoff.
 * Recebe os cards como children (cada um pode ser server component com dados reais).
 * Arrasto 1:1 com snap, setas, teclado ←/→, loop circular.
 */
export function Coverflow({
  children,
  cardWidth = 320,
}: {
  children: ReactNode;
  cardWidth?: number;
}) {
  const items = Children.toArray(children);
  const n = items.length;
  const [active, setActive] = useState(0);
  const [dragDx, setDragDx] = useState(0);
  const [dragging, setDragging] = useState(false);
  const drag = useRef({ startX: 0, moved: 0, down: false });

  const stepX = cardWidth + 16;
  const pos = active - dragDx / stepX;
  const mod = (x: number) => ((x % n) + n) % n;

  if (n === 0) return null;

  const onDown = (e: React.PointerEvent) => {
    drag.current = { startX: e.clientX, moved: 0, down: true };
    setDragging(true);
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  };
  const onMove = (e: React.PointerEvent) => {
    if (!drag.current.down) return;
    const dx = e.clientX - drag.current.startX;
    drag.current.moved = Math.max(drag.current.moved, Math.abs(dx));
    setDragDx(dx);
  };
  const onUp = (e: React.PointerEvent) => {
    if (!drag.current.down) return;
    const dx = e.clientX - drag.current.startX;
    setActive(Math.round(active - dx / stepX));
    setDragDx(0);
    setDragging(false);
    drag.current.down = false;
  };
  const go = (d: number) => setActive((a) => a + d);

  // Deslocamento circular mais curto.
  const wrapOff = (i: number) => {
    let off = i - pos;
    while (off > n / 2) off -= n;
    while (off < -n / 2) off += n;
    return off;
  };

  const tf = (off: number): CSSProperties => {
    const a = Math.min(Math.abs(off), 4);
    const lo = Math.floor(a);
    const hi = Math.min(lo + 1, 4);
    const f = a - lo;
    const A = TIERS[lo];
    const B = TIERS[hi];
    const L = (ka: number, kb: number) => ka + (kb - ka) * f;
    const sign = off < 0 ? -1 : 1;
    return {
      transform: `translate(-50%, -50%) translateX(${sign * L(A.x, B.x)}px) translateZ(${L(A.z, B.z)}px) rotateY(${-sign * L(A.ry, B.ry)}deg) scale(${L(A.s, B.s)})`,
      opacity: L(A.op, B.op),
      zIndex: Math.round(L(A.zi, B.zi)),
    };
  };

  const itemClick = (off: number) => {
    if (drag.current.moved > 8) return;
    const r = Math.round(off);
    if (r !== 0) setActive((a) => a + r);
  };

  return (
    <div className="cf">
      <div
        className={"cf-stage grab" + (dragging ? " grabbing dragging" : "")}
        tabIndex={0}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        onPointerLeave={(e) => {
          if (drag.current.down) onUp(e);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") go(1);
          else if (e.key === "ArrowLeft") go(-1);
        }}
      >
        <div className="cf-veil" />
        <div className="cf-floor" />
        {items.map((it, i) => {
          const off = wrapOff(i);
          if (Math.abs(off) > 4) return null;
          const isCenter = Math.abs(off) < 0.5;
          return (
            <div
              key={i}
              className={"cf-item" + (isCenter ? " is-center" : "")}
              style={tf(off)}
              onClick={() => itemClick(off)}
            >
              {it}
            </div>
          );
        })}
      </div>

      <div className="cf-controls">
        <button className="cf-arrow" onClick={() => go(-1)} aria-label="Anterior">
          <ChevronLeft size={20} />
        </button>
        <div className="cf-dots">
          {items.map((_, i) => (
            <button
              key={i}
              className={"cf-dot" + (i === mod(active) ? " on" : "")}
              onClick={() => setActive((a) => a + (i - mod(a)))}
              aria-label={"Ir para " + (i + 1)}
            />
          ))}
        </div>
        <div className="cf-counter">
          <b>{String(mod(active) + 1).padStart(2, "0")}</b> / {String(n).padStart(2, "0")}
        </div>
        <button className="cf-arrow" onClick={() => go(1)} aria-label="Próximo">
          <ChevronRight size={20} />
        </button>
      </div>
    </div>
  );
}
