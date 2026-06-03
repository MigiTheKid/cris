/**
 * Status de vencimento de um documento.
 * Espelha a função `expiry_status()` do banco (ver _docs/02-modelagem.md §4).
 * O status NUNCA é gravado — sempre derivado da data de validade.
 */
export type ExpiryStatus =
  | "sem_data" // sem validade cadastrada
  | "em_dia" // verde — falta mais de 30 dias
  | "atencao" // amarelo — D-30
  | "alerta" // laranja — D-15
  | "critico" // vermelho — D-7
  | "vencido"; // vencido

/**
 * Diferença em dias inteiros entre `expires` e `reference` (hoje por padrão).
 * Usa componentes UTC: datas só-data do banco ("2026-06-10") chegam como UTC
 * meia-noite, então comparamos no mesmo referencial pra não escorregar pelo fuso.
 */
export function daysUntil(expires: Date, reference: Date = new Date()): number {
  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  const a = Date.UTC(expires.getUTCFullYear(), expires.getUTCMonth(), expires.getUTCDate());
  const b = Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth(), reference.getUTCDate());
  return Math.round((a - b) / MS_PER_DAY);
}

/** Deriva o status a partir da data de validade. `reference` permite testar. */
export function expiryStatus(
  expires: Date | null | undefined,
  reference: Date = new Date(),
): ExpiryStatus {
  if (!expires) return "sem_data";
  const days = daysUntil(expires, reference);
  if (days < 0) return "vencido";
  if (days <= 7) return "critico";
  if (days <= 15) return "alerta";
  if (days <= 30) return "atencao";
  return "em_dia";
}

// Severidade para escolher o "pior" status de um conjunto (maior = pior).
const SEVERITY: Record<ExpiryStatus, number> = {
  sem_data: 0,
  em_dia: 1,
  atencao: 2,
  alerta: 3,
  critico: 4,
  vencido: 5,
};

/** Pior status entre vários (ex.: todos os documentos de um veículo). Vazio → sem_data. */
export function worstExpiryStatus(statuses: ExpiryStatus[]): ExpiryStatus {
  return statuses.reduce<ExpiryStatus>(
    (worst, s) => (SEVERITY[s] > SEVERITY[worst] ? s : worst),
    "sem_data",
  );
}
