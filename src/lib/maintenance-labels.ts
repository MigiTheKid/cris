/** Rótulos do módulo de manutenção — seguro para client e server. */

export type WorkOrderReason = "preventiva" | "corretiva" | "socorro" | "acidente" | "garantia";

export const REASON_LABEL: Record<WorkOrderReason, string> = {
  preventiva: "Preventiva",
  corretiva: "Corretiva",
  socorro: "Socorro em rota",
  acidente: "Acidente",
  garantia: "Garantia",
};
