import type { StatusTone } from "@/lib/status";

/** Chip neutro de status — a cor vive só no ponto (disciplina de cor §4). */
export function StatusBadge({ tone, label }: { tone: StatusTone; label: string }) {
  return (
    <span className={`status-badge ${tone}`}>
      <span className={`dot ${tone}`} />
      {label}
    </span>
  );
}
