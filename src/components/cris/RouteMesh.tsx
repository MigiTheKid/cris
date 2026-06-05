"use client";

import { useEffect, useRef } from "react";

/**
 * Fundo "malha de rotas" — nós + linhas tipo telemetria com pulsos âmbar
 * viajando pelas conexões. Portado do design handoff (background.jsx, variante mesh).
 * Tema claro. Respeita prefers-reduced-motion e pausa com a aba oculta.
 */
export function RouteMesh({ intensity = 2, speed = 0.55 }: { intensity?: number; speed?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = 0;
    let h = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const amp = intensity / 2;
    let raf = 0;
    let prev = 0;
    let hidden = false;

    const resize = () => {
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    // Nós e pulsos da malha.
    const N = 56;
    const nodes = Array.from({ length: N }, () => ({
      x: Math.random(),
      y: Math.random(),
      vx: (Math.random() - 0.5) * 0.00018,
      vy: (Math.random() - 0.5) * 0.00018,
      hub: Math.random() < 0.18,
    }));
    const pulses: { a: number; b: number; t: number; sp: number }[] = [];
    const linkN = 0.165;
    let lastSpawn = 0;

    const spawnPulse = () => {
      for (let tries = 0; tries < 24; tries++) {
        const a = (Math.random() * N) | 0;
        const b = (Math.random() * N) | 0;
        if (a === b) continue;
        const dx = nodes[a].x - nodes[b].x;
        const dy = nodes[a].y - nodes[b].y;
        if (Math.hypot(dx, dy) < linkN) {
          pulses.push({ a, b, t: 0, sp: 0.0034 + Math.random() * 0.0034 });
          return;
        }
      }
    };

    const lineCol = "20,90,95";
    const nodeCol = "12,70,76";

    const draw = (time: number, dt: number, animate: boolean) => {
      const diag = Math.hypot(w, h);
      const link = linkN * diag;

      if (animate) {
        for (const n of nodes) {
          n.x += n.vx * dt * speed;
          n.y += n.vy * dt * speed;
          if (n.x < 0 || n.x > 1) n.vx *= -1;
          if (n.y < 0 || n.y > 1) n.vy *= -1;
          n.x = Math.max(0, Math.min(1, n.x));
          n.y = Math.max(0, Math.min(1, n.y));
        }
        if (
          time - lastSpawn > 1300 / (0.5 + amp) / Math.max(0.2, speed) &&
          pulses.length < 5 + amp * 3
        ) {
          spawnPulse();
          lastSpawn = time;
        }
      }

      ctx.clearRect(0, 0, w, h);

      // arestas
      ctx.lineWidth = 1;
      for (let i = 0; i < N; i++) {
        const ni = nodes[i];
        const ax = ni.x * w;
        const ay = ni.y * h;
        for (let j = i + 1; j < N; j++) {
          const nj = nodes[j];
          const dx = (ni.x - nj.x) * w;
          const dy = (ni.y - nj.y) * h;
          const d = Math.hypot(dx, dy);
          if (d < link) {
            const a = (1 - d / link) * 0.16 * (0.55 + amp * 0.5);
            ctx.strokeStyle = `rgba(${lineCol},${a})`;
            ctx.beginPath();
            ctx.moveTo(ax, ay);
            ctx.lineTo(nj.x * w, nj.y * h);
            ctx.stroke();
          }
        }
      }

      // nós
      for (const n of nodes) {
        const r = n.hub ? 2.6 : 1.5;
        const a = (n.hub ? 0.5 : 0.32) * (0.5 + amp * 0.5);
        ctx.fillStyle = `rgba(${nodeCol},${a})`;
        ctx.beginPath();
        ctx.arc(n.x * w, n.y * h, r, 0, Math.PI * 2);
        ctx.fill();
        if (n.hub) {
          ctx.strokeStyle = `rgba(${nodeCol},${a * 0.4})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(n.x * w, n.y * h, r + 4, 0, Math.PI * 2);
          ctx.stroke();
        }
      }

      // pulsos âmbar
      for (let i = pulses.length - 1; i >= 0; i--) {
        const p = pulses[i];
        if (animate) p.t += p.sp * (dt / 16.7) * speed;
        if (p.t >= 1) {
          pulses.splice(i, 1);
          continue;
        }
        const na = nodes[p.a];
        const nb = nodes[p.b];
        const x = (na.x + (nb.x - na.x) * p.t) * w;
        const y = (na.y + (nb.y - na.y) * p.t) * h;
        const fade = Math.sin(p.t * Math.PI);
        const g = ctx.createRadialGradient(x, y, 0, x, y, 16);
        g.addColorStop(0, `rgba(248,199,45,${0.9 * fade})`);
        g.addColorStop(1, "rgba(248,199,45,0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, 16, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = `rgba(250,210,70,${fade})`;
        ctx.beginPath();
        ctx.arc(x, y, 2.2, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const frame = (time: number) => {
      const dt = Math.min(50, time - prev || 16);
      prev = time;
      if (!hidden) draw(time, dt, true);
      raf = requestAnimationFrame(frame);
    };

    const onVisibility = () => {
      hidden = document.hidden;
    };
    document.addEventListener("visibilitychange", onVisibility);

    if (reduce || intensity === 0) {
      draw(0, 16, false); // quadro estático
    } else {
      raf = requestAnimationFrame(frame);
    }

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [intensity, speed]);

  return <canvas ref={ref} className="bg-canvas" aria-hidden="true" />;
}
