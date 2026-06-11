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

/**
 * Vidas típicas de uma carcaça (nova + 2 recapagens). Ao atingir a janela de
 * recape já na 3ª vida, a recomendação vira COMPRAR novo (carcaça no fim).
 */
export const MAX_RECAP_LIVES = 3;

/** Limiares de sulco (mm). Personalizáveis em Configurações (app_settings). */
export type TireThresholds = { okMm: number; recapMm: number };

/** Padrão de fábrica: retirada legal é 1,6 — operamos com folga de segurança. */
export const DEFAULT_TIRE_THRESHOLDS: TireThresholds = { okMm: 5, recapMm: 3 };

/**
 * Catálogo controlado de pneus — marca/modelo/medida vêm daqui para evitar
 * divergência de cadastro ("Michelin" vs "michelin"). Cada modelo pertence a
 * uma marca. Gerenciável em Pneus → Catálogo (app_settings).
 */
export type TireModel = { brand: string; name: string };
export type TireCatalog = { brands: string[]; sizes: string[]; models: TireModel[] };

/** Sementes de mercado, para o sistema já nascer com listas úteis. */
export const DEFAULT_TIRE_CATALOG: TireCatalog = {
  brands: ["Michelin", "Pirelli", "Bridgestone", "Goodyear", "Continental", "Firestone"],
  sizes: ["275/80 R22.5", "295/80 R22.5", "275/70 R22.5", "215/75 R17.5"],
  models: [],
};

/** Saúde do pneu pelo sulco: verde ≥ ok, âmbar recap–ok (janela), vermelho < recap. */
export function treadTone(
  treadMm: number | null,
  t: TireThresholds = DEFAULT_TIRE_THRESHOLDS,
): { tone: StatusTone; label: string } {
  if (treadMm == null) return { tone: "idle", label: "Sem aferição" };
  if (treadMm < t.recapMm) return { tone: "crit", label: "Retirar" };
  if (treadMm < t.okMm) return { tone: "warn", label: "Janela de recape" };
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
