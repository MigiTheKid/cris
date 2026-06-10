import { createClient } from "@/lib/supabase/server";
import { expiryStatus, daysUntil } from "@/lib/expiry";
import { statusTone, type StatusTone } from "@/lib/status";
import { vehicleTypeLabel, companyLabel } from "@/lib/labels";
import type { Database } from "@/lib/database.types";

type VehicleDocType = Database["public"]["Enums"]["vehicle_doc_type"];

export type VehicleDoc = {
  id: string;
  docType: VehicleDocType;
  docNumber: string | null;
  issuedAt: string | null;
  expiresAt: string | null;
  filePath: string | null;
  tone: StatusTone;
  statusLabel: string;
  days: number | null;
};

export type AssignmentHistory = {
  driverName: string;
  assignedAt: string;
  unassignedAt: string | null;
};

export type VehicleDetail = {
  id: string;
  plate: string;
  model: string | null;
  vehicleType: Database["public"]["Enums"]["vehicle_type"];
  typeLabel: string;
  year: number | null;
  capacity: string | null;
  companyKind: Database["public"]["Enums"]["company_kind"];
  companyLabel: string;
  vehicleStatus: Database["public"]["Enums"]["vehicle_status"];
  tone: StatusTone;
  statusLabel: string;
  driverId: string | null;
  driverName: string | null;
  docsOkCount: number;
  docs: VehicleDoc[];
  history: AssignmentHistory[];
};

const DOC_ORDER: VehicleDocType[] = [
  "crlv",
  "cipp",
  "inmetro",
  "tara",
  "lac",
  "modal_rodoviario",
  "cert_regularidade",
  "outro",
];

/** Detalhe completo de um veículo (ou null). Cliente de sessão (RLS por cargo). */
export async function getVehicleDetail(id: string): Promise<VehicleDetail | null> {
  const db = await createClient();

  const { data: v } = await db
    .from("vehicles")
    .select(
      `id, plate, model, vehicle_type, year, capacity, status,
       company:companies(kind),
       documents:vehicle_documents(id, doc_type, doc_number, issued_at, expires_at, file_path, deleted_at)`,
    )
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (!v) return null;

  // Documentos (com status derivado), ordenados pela ordem canônica.
  const docs: VehicleDoc[] = (v.documents ?? [])
    .filter((d) => !d.deleted_at)
    .map((d) => {
      const date = d.expires_at ? new Date(d.expires_at) : null;
      const st = expiryStatus(date);
      const { tone, label } = statusTone(st);
      return {
        id: d.id,
        docType: d.doc_type,
        docNumber: d.doc_number,
        issuedAt: d.issued_at,
        expiresAt: d.expires_at,
        filePath: d.file_path,
        tone,
        statusLabel: label,
        days: date ? daysUntil(date) : null,
      };
    })
    .sort((a, b) => DOC_ORDER.indexOf(a.docType) - DOC_ORDER.indexOf(b.docType));

  const worstTone = docs.reduce<StatusTone>((w, d) => {
    const rank = { idle: 0, ok: 1, warn: 2, alert: 3, crit: 4 } as const;
    return rank[d.tone] > rank[w] ? d.tone : w;
  }, "idle");
  const { label: statusLabel } = statusTone(
    worstTone === "idle"
      ? "sem_data"
      : worstTone === "ok"
        ? "em_dia"
        : worstTone === "warn"
          ? "atencao"
          : worstTone === "alert"
            ? "alerta"
            : "critico",
  );

  // Atribuições (atual + histórico).
  const { data: assignments } = await db
    .from("vehicle_assignments")
    .select("driver_id, assigned_at, unassigned_at")
    .eq("vehicle_id", id)
    .order("assigned_at", { ascending: false });

  const driverIds = [...new Set((assignments ?? []).map((a) => a.driver_id))];
  const nameById = new Map<string, string>();
  if (driverIds.length > 0) {
    const { data: profiles } = await db
      .from("profiles")
      .select("id, full_name")
      .in("id", driverIds);
    for (const p of profiles ?? []) nameById.set(p.id, p.full_name);
  }

  const current = (assignments ?? []).find((a) => a.unassigned_at === null) ?? null;
  const history: AssignmentHistory[] = (assignments ?? []).map((a) => ({
    driverName: nameById.get(a.driver_id) ?? "—",
    assignedAt: a.assigned_at,
    unassignedAt: a.unassigned_at,
  }));

  return {
    id: v.id,
    plate: v.plate,
    model: v.model,
    vehicleType: v.vehicle_type,
    typeLabel: vehicleTypeLabel(v.vehicle_type),
    year: v.year,
    capacity: v.capacity,
    companyKind: v.company?.kind ?? "top_diesel",
    companyLabel: companyLabel(v.company?.kind ?? "top_diesel"),
    vehicleStatus: v.status,
    tone: worstTone,
    statusLabel,
    driverId: current?.driver_id ?? null,
    driverName: current ? (nameById.get(current.driver_id) ?? null) : null,
    docsOkCount: docs.filter((d) => d.tone === "ok").length,
    docs,
    history,
  };
}
