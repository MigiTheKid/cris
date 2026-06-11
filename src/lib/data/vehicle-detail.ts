import { createClient } from "@/lib/supabase/server";
import { expiryStatus, daysUntil, worstExpiryStatus, type ExpiryStatus } from "@/lib/expiry";
import { statusTone, type StatusTone } from "@/lib/status";
import { vehicleTypeLabel, companyLabel } from "@/lib/labels";
import { signedPhotoUrl } from "@/lib/storage";
import type { Database } from "@/lib/database.types";

export type VehicleDoc = {
  id: string;
  docType: string;
  docLabel: string;
  docDescription: string | null;
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

/** A "outra metade" da composição: reboque do cavalo, ou cavalo do reboque. */
export type CompositionUnit = {
  id: string;
  plate: string;
  model: string | null;
  tone: StatusTone;
  statusLabel: string;
  driverName: string | null; // só preenchido quando a outra metade é o cavalo
};

export type CouplingHistory = {
  plate: string;
  coupledAt: string;
  uncoupledAt: string | null;
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
  photoUrl: string | null;
  tone: StatusTone;
  statusLabel: string;
  driverId: string | null;
  driverName: string | null;
  docsOkCount: number;
  docs: VehicleDoc[];
  history: AssignmentHistory[];
  /** Engatado a este veículo agora (reboque se cavalo; cavalo se rebocado). */
  coupledTo: CompositionUnit | null;
  couplingHistory: CouplingHistory[];
};

/** Detalhe completo de um veículo (ou null). Cliente de sessão (RLS por cargo). */
export async function getVehicleDetail(id: string): Promise<VehicleDetail | null> {
  const db = await createClient();

  const { data: v } = await db
    .from("vehicles")
    .select(
      `id, plate, model, vehicle_type, year, capacity, status, photo_path,
       company:companies(kind),
       documents:vehicle_documents(id, doc_type, doc_number, issued_at, expires_at, file_path, deleted_at,
         dt:document_types(label, description, sort))`,
    )
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (!v) return null;

  // Documentos (com status derivado), ordenados pelo `sort` do catálogo.
  const docs: VehicleDoc[] = (v.documents ?? [])
    .filter((d) => !d.deleted_at)
    .map((d) => {
      const date = d.expires_at ? new Date(d.expires_at) : null;
      const st = expiryStatus(date);
      const { tone, label } = statusTone(st);
      return {
        id: d.id,
        docType: d.doc_type,
        docLabel: d.dt?.label ?? d.doc_type,
        docDescription: d.dt?.description ?? null,
        docNumber: d.doc_number,
        issuedAt: d.issued_at,
        expiresAt: d.expires_at,
        filePath: d.file_path,
        tone,
        statusLabel: label,
        days: date ? daysUntil(date) : null,
        _sort: d.dt?.sort ?? 999,
      };
    })
    .sort((a, b) => a._sort - b._sort)
    .map((d) => {
      const { _sort, ...doc } = d;
      void _sort;
      return doc;
    });

  // Pior status pelo vencimento cru (preserva a distinção crítico × vencido).
  const rawStatuses = (v.documents ?? [])
    .filter((d) => !d.deleted_at)
    .map((d) => expiryStatus(d.expires_at ? new Date(d.expires_at) : null));
  const { tone: worstTone, label: statusLabel } = statusTone(worstExpiryStatus(rawStatuses));

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

  // Composição (engate): cavalo → reboque atual; rebocado → cavalo atual.
  const isTractor = v.vehicle_type === "cavalo";
  const isTrailer = v.vehicle_type === "semi_reboque" || v.vehicle_type === "reboque";
  let coupledTo: CompositionUnit | null = null;
  let couplingHistory: CouplingHistory[] = [];
  if (isTractor || isTrailer) {
    const { data: couplings } = await db
      .from("vehicle_couplings")
      .select("tractor_id, trailer_id, coupled_at, uncoupled_at")
      .eq(isTractor ? "tractor_id" : "trailer_id", id)
      .order("coupled_at", { ascending: false });
    const rows = couplings ?? [];
    const otherIds = [...new Set(rows.map((c) => (isTractor ? c.trailer_id : c.tractor_id)))];

    type OtherUnit = { plate: string; model: string | null; statuses: ExpiryStatus[] };
    const otherById = new Map<string, OtherUnit>();
    if (otherIds.length > 0) {
      const { data: others } = await db
        .from("vehicles")
        .select("id, plate, model, documents:vehicle_documents(expires_at, deleted_at)")
        .in("id", otherIds);
      for (const o of others ?? []) {
        otherById.set(o.id, {
          plate: o.plate,
          model: o.model,
          statuses: (o.documents ?? [])
            .filter((d) => !d.deleted_at)
            .map((d) => expiryStatus(d.expires_at ? new Date(d.expires_at) : null)),
        });
      }
    }

    couplingHistory = rows.map((c) => ({
      plate: otherById.get(isTractor ? c.trailer_id : c.tractor_id)?.plate ?? "—",
      coupledAt: c.coupled_at,
      uncoupledAt: c.uncoupled_at,
    }));

    const activeCoupling = rows.find((c) => c.uncoupled_at === null) ?? null;
    if (activeCoupling) {
      const otherId = isTractor ? activeCoupling.trailer_id : activeCoupling.tractor_id;
      const other = otherById.get(otherId);
      if (other) {
        // Se a outra metade é o cavalo, o motorista do conjunto vem dele.
        let otherDriver: string | null = null;
        if (isTrailer) {
          const { data: tAssign } = await db
            .from("vehicle_assignments")
            .select("driver_id")
            .eq("vehicle_id", otherId)
            .is("unassigned_at", null)
            .maybeSingle();
          if (tAssign?.driver_id) {
            const { data: prof } = await db
              .from("profiles")
              .select("full_name")
              .eq("id", tAssign.driver_id)
              .maybeSingle();
            otherDriver = prof?.full_name ?? null;
          }
        }
        const st = statusTone(worstExpiryStatus(other.statuses));
        coupledTo = {
          id: otherId,
          plate: other.plate,
          model: other.model,
          tone: st.tone,
          statusLabel: st.label,
          driverName: otherDriver,
        };
      }
    }
  }

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
    photoUrl: await signedPhotoUrl(db, v.photo_path),
    tone: worstTone,
    statusLabel,
    driverId: current?.driver_id ?? null,
    driverName: current ? (nameById.get(current.driver_id) ?? null) : null,
    docsOkCount: docs.filter((d) => d.tone === "ok").length,
    docs,
    history,
    coupledTo,
    couplingHistory,
  };
}
