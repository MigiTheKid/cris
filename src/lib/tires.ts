import type { Database } from "@/lib/database.types";
import type { StatusTone } from "@/lib/status";

export type AxleKind = Database["public"]["Enums"]["axle_kind"];
export type TireStatus = Database["public"]["Enums"]["tire_status"];

export const AXLE_KIND_LABEL: Record<AxleKind, string> = {
  direcional: "Direcional",
  tracao: "Tração",
  truck: "Truck",
  arrastado: "Arrastado",
  reboque: "Reboque",
  outro: "Eixo",
};

export const TIRE_STATUS_LABEL: Record<TireStatus, string> = {
  em_uso: "Em uso",
  estoque: "Estoque",
  recapagem: "Na recapadora",
  conserto: "Em conserto",
  sucateado: "Sucateado",
  vendido: "Vendido",
};

/** Limiares de sulco (mm): retirada legal é 1,6 — operamos com folga de segurança. */
export const TREAD_OK_MM = 5;
export const TREAD_RECAP_MM = 3;

/** Saúde do pneu pelo sulco: verde ≥5, âmbar 3–5 (janela de recape), vermelho <3. */
export function treadTone(treadMm: number | null): { tone: StatusTone; label: string } {
  if (treadMm == null) return { tone: "idle", label: "Sem aferição" };
  if (treadMm < TREAD_RECAP_MM) return { tone: "crit", label: "Retirar" };
  if (treadMm < TREAD_OK_MM) return { tone: "warn", label: "Janela de recape" };
  return { tone: "ok", label: "Em dia" };
}

/** Código curto da posição: "1E", "2DE" (eixo 2, direito externo), "3DI"… */
export function positionCode(axleNumber: number, side: string, dualPos: string | null): string {
  return `${axleNumber}${side}${dualPos ?? ""}`;
}

/** Rótulo amigável: "Tração · LD externo". */
export function positionLabel(
  kind: AxleKind,
  axleNumber: number,
  side: string,
  dualPos: string | null,
): string {
  const kindLabel =
    kind === "reboque" || kind === "outro"
      ? `${AXLE_KIND_LABEL[kind]} ${axleNumber}º eixo`
      : AXLE_KIND_LABEL[kind];
  const sideLabel = side === "E" ? "LE" : "LD";
  const dualLabel = dualPos === "E" ? " externo" : dualPos === "I" ? " interno" : "";
  return `${kindLabel} · ${sideLabel}${dualLabel}`;
}

export type AxlePreset = { kind: AxleKind; dual: boolean };

/** Layouts típicos por tipo de veículo (ponto de partida — editável por veículo). */
export const AXLE_PRESETS: Record<string, AxlePreset[]> = {
  cavalo: [
    { kind: "direcional", dual: false },
    { kind: "tracao", dual: true },
    { kind: "arrastado", dual: false },
  ],
  truck: [
    { kind: "direcional", dual: false },
    { kind: "truck", dual: true },
    { kind: "truck", dual: true },
  ],
  toco: [
    { kind: "direcional", dual: false },
    { kind: "tracao", dual: true },
  ],
  bitruck: [
    { kind: "direcional", dual: false },
    { kind: "direcional", dual: false },
    { kind: "truck", dual: true },
    { kind: "truck", dual: true },
  ],
  semi_reboque: [
    { kind: "reboque", dual: true },
    { kind: "reboque", dual: true },
    { kind: "reboque", dual: true },
  ],
  reboque: [
    { kind: "reboque", dual: true },
    { kind: "reboque", dual: true },
  ],
  leve: [
    { kind: "direcional", dual: false },
    { kind: "tracao", dual: false },
  ],
};

/** Posições de um eixo na ordem de quem anda em volta do veículo. */
export function axlePositions(dual: boolean): { side: "E" | "D"; dualPos: "I" | "E" | null }[] {
  return dual
    ? [
        { side: "E", dualPos: "E" },
        { side: "E", dualPos: "I" },
        { side: "D", dualPos: "I" },
        { side: "D", dualPos: "E" },
      ]
    : [
        { side: "E", dualPos: null },
        { side: "D", dualPos: null },
      ];
}
