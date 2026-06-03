"use client";

import { useEffect, useRef } from "react";
import styles from "./login.module.css";

/** Fundo animado do login: grade de pontos com onda + brilho âmbar que segue o mouse.
 * Portado do design handoff (Login CRIS.html). Respeita prefers-reduced-motion. */
export function LoginDots() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let W = 0,
      H = 0,
      raf = 0;
    const t0 = performance.now();
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const mouse = { x: -9999, y: -9999, on: false };
    const GAP = 30,
      R = 150,
      SIG2 = 2 * 62 * 62;

    const resize = () => {
      W = cv.clientWidth;
      H = cv.clientHeight;
      cv.width = W * dpr;
      cv.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const onMove = (e: PointerEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      mouse.on = true;
    };
    const onLeave = () => {
      mouse.on = false;
      mouse.x = mouse.y = -9999;
    };
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerleave", onLeave);

    const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

    const draw = (now: number) => {
      const t = now - t0;
      ctx.clearRect(0, 0, W, H);
      const cols = Math.ceil(W / GAP) + 1,
        rows = Math.ceil(H / GAP) + 1;
      for (let i = 0; i < cols; i++) {
        const x = i * GAP;
        for (let j = 0; j < rows; j++) {
          const y = j * GAP;
          const wave = Math.sin(x * 0.012 + y * 0.012 + t * 0.0011) * 0.5 + 0.5;
          let r = 1.0 + wave * 0.9;
          let a = 0.1 + wave * 0.09;
          let amber = 0;
          if (mouse.on) {
            const dx = x - mouse.x,
              dy = y - mouse.y,
              d2 = dx * dx + dy * dy;
            if (d2 < R * R) {
              const inf = Math.exp(-d2 / SIG2);
              r += inf * 3.4;
              a += inf * 0.55;
              amber = inf;
            }
          }
          ctx.beginPath();
          ctx.arc(x, y, r, 0, 6.2832);
          if (amber > 0.05)
            ctx.fillStyle = `rgba(${lerp(16, 248, amber) | 0},${lerp(76, 199, amber) | 0},${lerp(82, 45, amber) | 0},${a})`;
          else ctx.fillStyle = `rgba(16,76,82,${a})`;
          ctx.fill();
        }
      }
      raf = requestAnimationFrame(draw);
    };

    if (reduce) draw(t0 + 1);
    else raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return <canvas ref={ref} className={styles.loginBg} aria-hidden="true" />;
}
