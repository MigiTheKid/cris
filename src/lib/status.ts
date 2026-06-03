import type { ExpiryStatus } from "./expiry";

/** Tom visual do design (ver handoff §4): cor vive só no ponto/símbolo. */
export type StatusTone = "ok" | "warn" | "alert" | "crit" | "idle";

/** Mapeia o status de vencimento do domínio para tom + rótulo de UI. */
export function statusTone(status: ExpiryStatus): { tone: StatusTone; label: string } {
  switch (status) {
    case "em_dia":
      return { tone: "ok", label: "Em dia" };
    case "atencao":
      return { tone: "warn", label: "Atenção" };
    case "alerta":
      return { tone: "alert", label: "Alerta" };
    case "critico":
      return { tone: "crit", label: "Crítico" };
    case "vencido":
      return { tone: "crit", label: "Vencido" };
    case "sem_data":
    default:
      return { tone: "idle", label: "Sem data" };
  }
}
