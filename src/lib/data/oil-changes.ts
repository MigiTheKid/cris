import { createClient } from "@/lib/supabase/server";
import type { StatusTone } from "@/lib/status";

export type OilChange = {
  id: string;
  changedAt: string | null;
  odometerKm: number;
  nextKm: number | null;
  oilSpec: string | null;
  filterChanged: boolean;
  vendor: string | null;
  cost: number | null;
  notes: string | null;
};

export type OilStatus = {
  hasData: boolean;
  latestKm: number | null; // maior km conhecida do veículo (trocas + pneus)
  lastChangeKm: number | null;
  nextKm: number | null; // alvo da próxima troca
  intervalKm: number | null; // nextKm - km da última troca
  remainingKm: number | null; // nextKm - latestKm
  tone: StatusTone;
  label: string;
};

export type VehicleOil = { changes: OilChange[]; status: OilStatus };

/** Limiar de "chegando": avisa quando faltam ≤ 10% do intervalo (mín. 1.500 km). */
function warnBuffer(intervalKm: number | null): number {
  if (!intervalKm || intervalKm <= 0) return 1500;
  return Math.max(1500, Math.round(intervalKm * 0.1));
}

/** Trocas de óleo de um veículo + status preventivo (por km). Cliente de sessão. */
export async function getVehicleOilChanges(vehicleId: string): Promise<VehicleOil> {
  const db = await createClient();

  const { data } = await db
    .from("oil_changes")
    .select("id, changed_at, odometer_km, next_km, oil_spec, filter_changed, vendor, cost, notes")
    .eq("vehicle_id", vehicleId)
    .order("odometer_km", { ascending: false });

  const changes: OilChange[] = (data ?? []).map((c) => ({
    id: c.id,
    changedAt: c.changed_at,
    odometerKm: c.odometer_km,
    nextKm: c.next_km,
    oilSpec: c.oil_spec,
    filterChanged: c.filter_changed,
    vendor: c.vendor,
    cost: c.cost,
    notes: c.notes,
  }));

  // Maior km conhecida do veículo: das trocas + das instalações de pneu (têm km).
  const { data: installs } = await db
    .from("tire_installations")
    .select("installed_km, removed_km")
    .eq("vehicle_id", vehicleId);
  const kmCandidates: number[] = [
    ...changes.map((c) => c.odometerKm),
    ...(installs ?? []).flatMap((i) => [i.installed_km, i.removed_km]),
  ].filter((n): n is number => typeof n === "number");
  const latestKm = kmCandidates.length ? Math.max(...kmCandidates) : null;

  const last = changes[0] ?? null; // mais recente por km
  const nextKm = last?.nextKm ?? null;
  const intervalKm = last && nextKm != null ? nextKm - last.odometerKm : null;
  const remainingKm = nextKm != null && latestKm != null ? nextKm - latestKm : null;

  let tone: StatusTone = "idle";
  let label = "Sem registro";
  if (last) {
    if (remainingKm == null) {
      tone = "idle";
      label = "Sem km de referência";
    } else if (remainingKm <= 0) {
      tone = "crit";
      label = `Vencida há ${Math.abs(remainingKm).toLocaleString("pt-BR")} km`;
    } else if (remainingKm <= warnBuffer(intervalKm)) {
      tone = "warn";
      label = `Faltam ${remainingKm.toLocaleString("pt-BR")} km`;
    } else {
      tone = "ok";
      label = `Faltam ${remainingKm.toLocaleString("pt-BR")} km`;
    }
  }

  return {
    changes,
    status: {
      hasData: !!last,
      latestKm,
      lastChangeKm: last?.odometerKm ?? null,
      nextKm,
      intervalKm,
      remainingKm,
      tone,
      label,
    },
  };
}
