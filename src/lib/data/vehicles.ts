import { createAdminClient } from "@/lib/supabase/admin";
import { expiryStatus, worstExpiryStatus, type ExpiryStatus } from "@/lib/expiry";
import type { Database } from "@/lib/database.types";

export type VehicleListItem = {
  id: string;
  plate: string;
  model: string | null;
  vehicleType: Database["public"]["Enums"]["vehicle_type"];
  companyKind: Database["public"]["Enums"]["company_kind"];
  driverName: string | null;
  status: ExpiryStatus;
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
  const db = createAdminClient();
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

  return rows.map((v) => {
    const activeDriverId = v.assignments?.find((a) => a.unassigned_at === null)?.driver_id ?? null;
    const docStatuses = (v.documents ?? [])
      .filter((d) => !d.deleted_at)
      .map((d) => expiryStatus(d.expires_at ? new Date(d.expires_at) : null));
    return {
      id: v.id,
      plate: v.plate,
      model: v.model,
      vehicleType: v.vehicle_type,
      companyKind: v.company?.kind ?? "top_diesel",
      driverName: activeDriverId ? (names.get(activeDriverId) ?? null) : null,
      status: worstExpiryStatus(docStatuses),
    };
  });
}
