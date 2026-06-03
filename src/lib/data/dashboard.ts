import { createAdminClient } from "@/lib/supabase/admin";
import { expiryStatus, daysUntil, worstExpiryStatus } from "@/lib/expiry";
import { statusTone, type StatusTone } from "@/lib/status";
import type { Database } from "@/lib/database.types";

type VehicleDocType = Database["public"]["Enums"]["vehicle_doc_type"];

export type CriticalItem = {
  plate: string;
  model: string | null;
  docType: VehicleDocType;
  days: number;
  tone: StatusTone;
};

export type FleetDashboard = {
  total: number;
  counts: Record<StatusTone, number>;
  conformidadePct: number;
  criticos: number; // documentos vencidos/críticos
  vencendo15: number;
  vencendo30: number;
  criticalItems: CriticalItem[];
};

/**
 * Resumo da frota para o Painel. TEMPORÁRIO: cliente admin (sem RLS) até o login.
 */
export async function getFleetDashboard(): Promise<FleetDashboard> {
  const db = createAdminClient();
  const { data, error } = await db
    .from("vehicles")
    .select(`plate, model, documents:vehicle_documents(doc_type, expires_at, deleted_at)`)
    .is("deleted_at", null)
    .order("plate");
  if (error) throw new Error(`getFleetDashboard: ${error.message}`);
  const rows = data ?? [];

  const counts: Record<StatusTone, number> = { ok: 0, warn: 0, alert: 0, crit: 0, idle: 0 };
  const criticalItems: CriticalItem[] = [];
  let vencendo15 = 0;
  let vencendo30 = 0;
  let criticos = 0;

  for (const v of rows) {
    const docs = (v.documents ?? []).filter((d) => !d.deleted_at);
    const perDoc = docs.map((d) => {
      const date = d.expires_at ? new Date(d.expires_at) : null;
      return { docType: d.doc_type, date, status: expiryStatus(date) };
    });

    // contagem por veículo (pior status)
    const worst = worstExpiryStatus(perDoc.map((d) => d.status));
    counts[statusTone(worst).tone] += 1;

    // detalhe por documento
    for (const d of perDoc) {
      const { tone } = statusTone(d.status);
      if (tone === "crit") {
        criticos += 1;
        if (d.date) {
          criticalItems.push({
            plate: v.plate,
            model: v.model,
            docType: d.docType,
            days: daysUntil(d.date),
            tone,
          });
        }
      }
      if (d.date) {
        const days = daysUntil(d.date);
        if (days >= 0 && days <= 15) vencendo15 += 1;
        if (days >= 0 && days <= 30) vencendo30 += 1;
      }
    }
  }

  criticalItems.sort((a, b) => a.days - b.days); // mais urgente primeiro
  const total = rows.length;
  const conformidadePct = total > 0 ? Math.round((counts.ok / total) * 100) : 0;

  return { total, counts, conformidadePct, criticos, vencendo15, vencendo30, criticalItems };
}
