import { createAdminClient } from "@/lib/supabase/admin";

export type DriverCard = {
  id: string;
  name: string;
  vehiclePlate: string | null;
};

/**
 * Cards de motoristas para o Painel. TEMPORÁRIO: cliente admin (sem RLS) até o login.
 * Resolve o veículo atual via queries separadas (evita embed ambíguo de profiles).
 */
export async function getDriverCards(): Promise<DriverCard[]> {
  const db = createAdminClient();

  const { data: drivers, error } = await db
    .from("profiles")
    .select("id, full_name")
    .eq("role", "driver")
    .eq("is_active", true)
    .order("full_name");
  if (error) throw new Error(`getDriverCards: ${error.message}`);

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

  return (drivers ?? []).map((d) => ({
    id: d.id,
    name: d.full_name,
    vehiclePlate: plateByDriver.get(d.id) ?? null,
  }));
}
