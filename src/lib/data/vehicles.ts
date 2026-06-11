import { createClient } from "@/lib/supabase/server";
import { expiryStatus, worstExpiryStatus, type ExpiryStatus } from "@/lib/expiry";
import type { Database } from "@/lib/database.types";

export type VehicleListItem = {
  id: string;
  plate: string;
  model: string | null;
  vehicleType: Database["public"]["Enums"]["vehicle_type"];
  companyKind: Database["public"]["Enums"]["company_kind"];
  driverName: string | null;
  /** Quando o motorista é herdado do cavalo engatado: a placa do cavalo. */
  driverViaPlate: string | null;
  status: ExpiryStatus;
  /** Placa da outra metade da composição (reboque do cavalo / cavalo do reboque). */
  coupledPlate: string | null;
};

/**
 * Lista de veículos para a página Frota.
 * TEMPORÁRIO: usa o cliente admin (service role) enquanto não há login.
 * Migra para o cliente da sessão (RLS por cargo) quando o auth entrar.
 *
 * O nome do motorista é resolvido numa segunda query (evita o embed ambíguo
 * de `vehicle_assignments → profiles`, que tem 2 FKs: driver_id e created_by).
 */
export async function getVehicleList(): Promise<VehicleListItem[]> {
  const db = await createClient();
  const { data, error } = await db
    .from("vehicles")
    .select(
      `id, plate, model, vehicle_type,
       company:companies(kind),
       assignments:vehicle_assignments(driver_id, unassigned_at),
       documents:vehicle_documents(expires_at, deleted_at)`,
    )
    .is("deleted_at", null)
    .order("plate");

  if (error) throw new Error(`getVehicleList: ${error.message}`);
  const rows = data ?? [];

  // Resolve nomes dos motoristas atribuídos em uma query.
  const driverIds = [
    ...new Set(
      rows
        .map((v) => v.assignments?.find((a) => a.unassigned_at === null)?.driver_id)
        .filter((id): id is string => !!id),
    ),
  ];
  const names = new Map<string, string>();
  if (driverIds.length > 0) {
    const { data: profiles } = await db
      .from("profiles")
      .select("id, full_name")
      .in("id", driverIds);
    for (const p of profiles ?? []) names.set(p.id, p.full_name);
  }

  // Motorista próprio (atribuição ativa) por veículo — base para herança.
  const ownDriverIdById = new Map<string, string>();
  for (const v of rows) {
    const id = v.assignments?.find((a) => a.unassigned_at === null)?.driver_id;
    if (id) ownDriverIdById.set(v.id, id);
  }

  // Engates ativos → placa da outra metade (dois sentidos) + motorista herdado
  // pelo reboque (vem do cavalo do conjunto).
  const plateById = new Map(rows.map((v) => [v.id, v.plate]));
  const coupledPlateById = new Map<string, string>();
  const inheritedDriverIdByTrailer = new Map<string, string>();
  const inheritedFromPlateByTrailer = new Map<string, string>();
  const { data: couplings } = await db
    .from("vehicle_couplings")
    .select("tractor_id, trailer_id")
    .is("uncoupled_at", null);
  for (const c of couplings ?? []) {
    const tractorPlate = plateById.get(c.tractor_id);
    const trailerPlate = plateById.get(c.trailer_id);
    if (trailerPlate) coupledPlateById.set(c.tractor_id, trailerPlate);
    if (tractorPlate) coupledPlateById.set(c.trailer_id, tractorPlate);
    const tractorDriverId = ownDriverIdById.get(c.tractor_id);
    if (tractorDriverId) inheritedDriverIdByTrailer.set(c.trailer_id, tractorDriverId);
    if (tractorPlate) inheritedFromPlateByTrailer.set(c.trailer_id, tractorPlate);
  }

  return rows.map((v) => {
    const isTrailer = v.vehicle_type === "semi_reboque" || v.vehicle_type === "reboque";
    const activeDriverId = ownDriverIdById.get(v.id) ?? null;
    let driverName = activeDriverId ? (names.get(activeDriverId) ?? null) : null;
    let driverViaPlate: string | null = null;
    // Reboque sem motorista próprio herda o do cavalo engatado.
    if (!driverName && isTrailer) {
      const inhId = inheritedDriverIdByTrailer.get(v.id);
      if (inhId) {
        driverName = names.get(inhId) ?? null;
        driverViaPlate = inheritedFromPlateByTrailer.get(v.id) ?? null;
      }
    }
    const docStatuses = (v.documents ?? [])
      .filter((d) => !d.deleted_at)
      .map((d) => expiryStatus(d.expires_at ? new Date(d.expires_at) : null));
    return {
      id: v.id,
      plate: v.plate,
      model: v.model,
      vehicleType: v.vehicle_type,
      companyKind: v.company?.kind ?? "top_diesel",
      driverName,
      driverViaPlate,
      status: worstExpiryStatus(docStatuses),
      coupledPlate: coupledPlateById.get(v.id) ?? null,
    };
  });
}

export type TrailerOption = {
  id: string;
  plate: string;
  model: string | null;
  tractorPlate: string | null; // engatado em qual cavalo agora (null = livre)
};

/** Reboques disponíveis para engate (semi_reboque/reboque ativos). */
export async function getTrailerOptions(): Promise<TrailerOption[]> {
  const db = await createClient();
  const { data, error } = await db
    .from("vehicles")
    .select("id, plate, model, vehicle_type")
    .in("vehicle_type", ["semi_reboque", "reboque"])
    .eq("status", "ativo")
    .is("deleted_at", null)
    .order("plate");
  if (error) throw new Error(`getTrailerOptions: ${error.message}`);
  const trailers = data ?? [];
  if (trailers.length === 0) return [];

  const { data: couplings } = await db
    .from("vehicle_couplings")
    .select("tractor_id, trailer_id")
    .is("uncoupled_at", null)
    .in(
      "trailer_id",
      trailers.map((t) => t.id),
    );
  const tractorIds = [...new Set((couplings ?? []).map((c) => c.tractor_id))];
  const tractorPlateById = new Map<string, string>();
  if (tractorIds.length > 0) {
    const { data: tractors } = await db.from("vehicles").select("id, plate").in("id", tractorIds);
    for (const t of tractors ?? []) tractorPlateById.set(t.id, t.plate);
  }
  const tractorByTrailer = new Map<string, string>();
  for (const c of couplings ?? []) {
    const plate = tractorPlateById.get(c.tractor_id);
    if (plate) tractorByTrailer.set(c.trailer_id, plate);
  }

  return trailers.map((t) => ({
    id: t.id,
    plate: t.plate,
    model: t.model,
    tractorPlate: tractorByTrailer.get(t.id) ?? null,
  }));
}
