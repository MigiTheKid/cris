import { createClient } from "@/lib/supabase/server";
import { expiryStatus, daysUntil, worstExpiryStatus, type ExpiryStatus } from "@/lib/expiry";
import { statusTone, type StatusTone } from "@/lib/status";
import { signedPhotoUrl } from "@/lib/storage";

export function maskCpf(cpf: string): string {
  const d = cpf.replace(/\D/g, "").padStart(11, "0").slice(0, 11);
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

function worstOf(statuses: ExpiryStatus[]): StatusTone {
  return statusTone(worstExpiryStatus(statuses)).tone;
}

export type DriverListItem = {
  id: string;
  name: string;
  cpf: string;
  cnhCategory: string | null;
  vehiclePlate: string | null;
  tone: StatusTone;
  statusLabel: string;
};

export type DriverDoc = {
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

export type DriverDetail = {
  id: string;
  name: string;
  cpf: string;
  phone: string | null;
  photoUrl: string | null;
  cnhCategory: string | null;
  birthDate: string | null;
  hiredAt: string | null;
  vehiclePlate: string | null;
  vehicleId: string | null;
  tone: StatusTone;
  statusLabel: string;
  docsOkCount: number;
  docs: DriverDoc[];
};

/** Lista de motoristas com status documental e veículo atual. Cliente de sessão (RLS). */
export async function getDriverList(): Promise<DriverListItem[]> {
  const db = await createClient();

  const { data, error } = await db
    .from("profiles")
    .select(
      `id, full_name, cpf,
       driver_profiles(cnh_category),
       documents:driver_documents!driver_id(expires_at, deleted_at)`,
    )
    .eq("role", "driver")
    .eq("is_active", true)
    .order("full_name");
  if (error) throw new Error(`getDriverList: ${error.message}`);
  const rows = data ?? [];

  // Veículo atual por motorista.
  const { data: assignments } = await db
    .from("vehicle_assignments")
    .select("driver_id, vehicle_id")
    .is("unassigned_at", null);
  const vehicleIds = [...new Set((assignments ?? []).map((a) => a.vehicle_id))];
  const plateById = new Map<string, string>();
  if (vehicleIds.length > 0) {
    const { data: vehicles } = await db.from("vehicles").select("id, plate").in("id", vehicleIds);
    for (const v of vehicles ?? []) plateById.set(v.id, v.plate);
  }
  const plateByDriver = new Map<string, string>();
  for (const a of assignments ?? []) {
    const plate = plateById.get(a.vehicle_id);
    if (plate) plateByDriver.set(a.driver_id, plate);
  }

  return rows.map((d) => {
    const statuses = (d.documents ?? [])
      .filter((x) => !x.deleted_at)
      .map((x) => expiryStatus(x.expires_at ? new Date(x.expires_at) : null));
    const tone = worstOf(statuses);
    return {
      id: d.id,
      name: d.full_name,
      cpf: maskCpf(d.cpf),
      cnhCategory: d.driver_profiles?.cnh_category ?? null,
      vehiclePlate: plateByDriver.get(d.id) ?? null,
      tone,
      statusLabel: statusTone(worstExpiryStatus(statuses)).label,
    };
  });
}

/** Detalhe de um motorista (ou null). Cliente de sessão (RLS). */
export async function getDriverDetail(id: string): Promise<DriverDetail | null> {
  const db = await createClient();

  const { data: p } = await db
    .from("profiles")
    .select(
      `id, full_name, cpf, phone, photo_path,
       driver_profiles(cnh_category, birth_date, hired_at),
       documents:driver_documents!driver_id(id, doc_type, doc_number, issued_at, expires_at, file_path, deleted_at,
         dt:document_types(label, description, sort))`,
    )
    .eq("id", id)
    .eq("role", "driver")
    .maybeSingle();
  if (!p) return null;

  const docs: DriverDoc[] = (p.documents ?? [])
    .filter((d) => !d.deleted_at)
    .map((d) => {
      const date = d.expires_at ? new Date(d.expires_at) : null;
      const { tone, label } = statusTone(expiryStatus(date));
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

  const tone = worstOf(docs.map((d) => expiryStatus(d.expiresAt ? new Date(d.expiresAt) : null)));

  // Veículo atual.
  const { data: assign } = await db
    .from("vehicle_assignments")
    .select("vehicle_id")
    .eq("driver_id", id)
    .is("unassigned_at", null)
    .maybeSingle();
  let vehiclePlate: string | null = null;
  if (assign?.vehicle_id) {
    const { data: v } = await db
      .from("vehicles")
      .select("plate")
      .eq("id", assign.vehicle_id)
      .maybeSingle();
    vehiclePlate = v?.plate ?? null;
  }

  return {
    id: p.id,
    name: p.full_name,
    cpf: maskCpf(p.cpf),
    phone: p.phone,
    photoUrl: await signedPhotoUrl(db, p.photo_path),
    cnhCategory: p.driver_profiles?.cnh_category ?? null,
    birthDate: p.driver_profiles?.birth_date ?? null,
    hiredAt: p.driver_profiles?.hired_at ?? null,
    vehiclePlate,
    vehicleId: assign?.vehicle_id ?? null,
    tone,
    statusLabel: statusTone(
      worstExpiryStatus(docs.map((d) => expiryStatus(d.expiresAt ? new Date(d.expiresAt) : null))),
    ).label,
    docsOkCount: docs.filter((d) => d.tone === "ok").length,
    docs,
  };
}
