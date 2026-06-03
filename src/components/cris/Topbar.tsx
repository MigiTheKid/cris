"use client";

import { useEffect, useState } from "react";
import { Search, Bell, Smartphone } from "lucide-react";

function useClock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    // Começa nulo no SSR e preenche no cliente (evita mismatch de hidratação).
    const id = setInterval(() => setNow(new Date()), 1000);
    const raf = requestAnimationFrame(() => setNow(new Date()));
    return () => {
      clearInterval(id);
      cancelAnimationFrame(raf);
    };
  }, []);
  return now;
}

export function Topbar() {
  const now = useClock();
  const time = now
    ? now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
    : "--:--";
  const date = now
    ? now.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" })
    : "";

  return (
    <header className="topbar">
      <div className="clock">
        <span className="clock-time">{time}</span>
        <span className="clock-date">{date}</span>
      </div>

      <span className="live-pill glass">
        <span className="dot ok live" />
        Frota operando
      </span>

      <div className="topbar-actions">
        <label className="search glass">
          <Search size={17} strokeWidth={1.8} />
          <input placeholder="Buscar placa, motorista, documento…" />
          <kbd className="mono">Ctrl K</kbd>
        </label>

        <button className="driverapp-btn" title="Ver App do Motorista">
          <Smartphone size={16} strokeWidth={1.8} />
          <span>App do Motorista</span>
        </button>

        <button className="icon-btn glass" title="Alertas críticos">
          <Bell size={19} strokeWidth={1.8} />
        </button>
      </div>
    </header>
  );
}
