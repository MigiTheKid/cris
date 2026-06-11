import { createClient } from "@/lib/supabase/server";
import type { StatusTone } from "@/lib/status";

export type OilCostCategory = "insumo" | "mao_de_obra";
export type OilCostItem = {
  category: OilCostCategory;
  label: string;
  quantity: number | null;
  unit: string | null;
  cost: number;
};

export type OilChange = {
  id: string;
  changedAt: string | null;
  odometerKm: number;
  nextKm: number | null;
  oilSpec: string | null;
  filterChanged: boolean;
  vendorId: string | null;
  vendorName: string | null;
  notes: string | null;
  items: OilCostItem[];
  total: number; // soma dos itens (ou o custo legado, se não houver itens)
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

function toneFor(
  remainingKm: number | null,
  intervalKm: number | null,
): { tone: StatusTone; label: string } {
  if (remainingKm == null) return { tone: "idle", label: "sem km" };
  if (remainingKm <= 0)
    return {
      tone: "crit",
      label: `vencida há ${Math.abs(remainingKm).toLocaleString("pt-BR")} km`,
    };
  if (remainingKm <= warnBuffer(intervalKm))
    return { tone: "warn", label: `faltam ${remainingKm.toLocaleString("pt-BR")} km` };
  return { tone: "ok", label: `faltam ${remainingKm.toLocaleString("pt-BR")} km` };
}

export type OilAnalytics = {
  totalSpent: number;
  changeCount: number;
  avgPerChange: number;
  insumoTotal: number;
  laborTotal: number;
  byInsumo: { label: string; total: number; qty: number; unit: string | null }[];
  oilPricePerLiter: number | null;
  byVendor: { name: string; total: number; count: number }[];
  due: { vehicleId: string; plate: string; nextKm: number; tone: StatusTone; label: string }[];
};

/** Análise de troca de óleo da frota inteira (página T.M.A.). Cliente de sessão. */
export async function getOilAnalytics(): Promise<OilAnalytics> {
  const db = await createClient();
  const [{ data: changes }, { data: vehicles }, { data: installs }] = await Promise.all([
    db
      .from("oil_changes")
      .select(
        "id, vehicle_id, odometer_km, next_km, cost, vendorRel:vendors(name), oil_change_items(category, label, quantity, unit, cost)",
      ),
    db.from("vehicles").select("id, plate").is("deleted_at", null),
    db.from("tire_installations").select("vehicle_id, installed_km, removed_km"),
  ]);

  const rows = changes ?? [];
  const plateById = new Map((vehicles ?? []).map((v) => [v.id, v.plate]));

  // KM conhecido por veículo (trocas + instalações de pneu).
  const kmByVehicle = new Map<string, number>();
  const bump = (vid: string, km: number | null) => {
    if (km == null) return;
    kmByVehicle.set(vid, Math.max(kmByVehicle.get(vid) ?? 0, km));
  };
  for (const r of rows) bump(r.vehicle_id, r.odometer_km);
  for (const i of installs ?? []) {
    bump(i.vehicle_id, i.installed_km);
    bump(i.vehicle_id, i.removed_km);
  }

  let totalSpent = 0;
  let insumoTotal = 0;
  let laborTotal = 0;
  const insumoMap = new Map<string, { total: number; qty: number; unit: string | null }>();
  let oilCost = 0;
  let oilLiters = 0;
  const vendorMap = new Map<string, { total: number; count: number }>();

  for (const r of rows) {
    totalSpent += Number(r.cost ?? 0);
    const vName = r.vendorRel?.name;
    if (vName) {
      const v = vendorMap.get(vName) ?? { total: 0, count: 0 };
      v.total += Number(r.cost ?? 0);
      v.count += 1;
      vendorMap.set(vName, v);
    }
    for (const it of r.oil_change_items ?? []) {
      const cost = Number(it.cost);
      const qty = it.quantity != null ? Number(it.quantity) : 0;
      if (it.category === "mao_de_obra") {
        laborTotal += cost;
      } else {
        insumoTotal += cost;
        const cur = insumoMap.get(it.label) ?? { total: 0, qty: 0, unit: it.unit };
        cur.total += cost;
        cur.qty += qty;
        insumoMap.set(it.label, cur);
        if (/óleo|oleo/i.test(it.label) && it.unit === "L") {
          oilCost += cost;
          oilLiters += qty;
        }
      }
    }
  }

  // Próximas trocas (mais urgentes primeiro): última troca por veículo.
  const latestByVehicle = new Map<string, (typeof rows)[number]>();
  for (const r of rows) {
    const cur = latestByVehicle.get(r.vehicle_id);
    if (!cur || r.odometer_km > cur.odometer_km) latestByVehicle.set(r.vehicle_id, r);
  }
  const due = [...latestByVehicle.values()]
    .filter((r) => r.next_km != null)
    .map((r) => {
      const latestKm = kmByVehicle.get(r.vehicle_id) ?? r.odometer_km;
      const remaining = (r.next_km as number) - latestKm;
      const { tone, label } = toneFor(remaining, (r.next_km as number) - r.odometer_km);
      return {
        vehicleId: r.vehicle_id,
        plate: plateById.get(r.vehicle_id) ?? "—",
        nextKm: r.next_km as number,
        remaining,
        tone,
        label,
      };
    })
    .sort((a, b) => a.remaining - b.remaining)
    .map(({ remaining, ...rest }) => {
      void remaining;
      return rest;
    });

  return {
    totalSpent,
    changeCount: rows.length,
    avgPerChange: rows.length ? totalSpent / rows.length : 0,
    insumoTotal,
    laborTotal,
    byInsumo: [...insumoMap.entries()]
      .map(([label, v]) => ({ label, ...v }))
      .sort((a, b) => b.total - a.total),
    oilPricePerLiter: oilLiters > 0 ? oilCost / oilLiters : null,
    byVendor: [...vendorMap.entries()]
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.total - a.total),
    due,
  };
}

/** Trocas de óleo de um veículo + status preventivo (por km). Cliente de sessão. */
export async function getVehicleOilChanges(vehicleId: string): Promise<VehicleOil> {
  const db = await createClient();

  const { data } = await db
    .from("oil_changes")
    .select(
      "id, changed_at, odometer_km, next_km, oil_spec, filter_changed, vendor, vendor_id, cost, notes, vendorRel:vendors(name), oil_change_items(category, label, quantity, unit, cost)",
    )
    .eq("vehicle_id", vehicleId)
    .order("odometer_km", { ascending: false });

  const changes: OilChange[] = (data ?? []).map((c) => {
    const items: OilCostItem[] = (c.oil_change_items ?? []).map((i) => ({
      category: i.category as OilCostCategory,
      label: i.label,
      quantity: i.quantity != null ? Number(i.quantity) : null,
      unit: i.unit,
      cost: Number(i.cost),
    }));
    const total = items.length
      ? items.reduce((s, i) => s + i.cost, 0)
      : typeof c.cost === "number"
        ? c.cost
        : 0;
    return {
      id: c.id,
      changedAt: c.changed_at,
      odometerKm: c.odometer_km,
      nextKm: c.next_km,
      oilSpec: c.oil_spec,
      filterChanged: c.filter_changed,
      vendorId: c.vendor_id,
      vendorName: c.vendorRel?.name ?? c.vendor,
      notes: c.notes,
      items,
      total,
    };
  });

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
