import { createClient } from "@/lib/supabase/server";
import type { StatusTone } from "@/lib/status";

export type WoCostCategory = "peca" | "mao_de_obra";
export type WoCost = {
  category: WoCostCategory;
  label: string;
  quantity: number | null;
  unit: string | null;
  cost: number;
};

export type WoItem = {
  id: string;
  serviceId: string | null;
  label: string;
  systemId: number;
  systemName: string;
  description: string | null;
  nextKm: number | null;
  costs: WoCost[];
  total: number;
};

export type { WorkOrderReason } from "@/lib/maintenance-labels";
import type { WorkOrderReason } from "@/lib/maintenance-labels";

export type WorkOrder = {
  id: string;
  performedAt: string | null;
  odometerKm: number;
  reason: WorkOrderReason;
  vendorId: string | null;
  vendorName: string | null;
  osRef: string | null;
  notes: string | null;
  items: WoItem[];
  total: number;
};

export type MaintSystem = { id: number; name: string };

export type ServiceOption = {
  id: string;
  name: string;
  systemId: number;
  systemName: string;
  defaultIntervalKm: number | null;
  isActive: boolean;
};

/** Próxima intervenção prevista (um item de OS com "próxima em X km"). */
export type UpcomingItem = {
  label: string;
  systemName: string;
  nextKm: number;
  remainingKm: number | null;
  tone: StatusTone;
  statusLabel: string;
};

export type VehicleMaintenance = {
  orders: WorkOrder[];
  upcoming: UpcomingItem[];
  latestKm: number | null;
  totalSpent: number;
};

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

/** Sistemas do veículo (taxonomia fixa) + catálogo de serviços. */
export async function getMaintenanceCatalog(): Promise<{
  systems: MaintSystem[];
  services: ServiceOption[];
}> {
  const db = await createClient();
  const [{ data: systems }, { data: services }] = await Promise.all([
    db.from("maintenance_systems").select("id, name").eq("is_active", true).order("sort"),
    db
      .from("service_catalog")
      .select(
        "id, name, system_id, default_interval_km, is_active, system:maintenance_systems(name)",
      )
      .order("name"),
  ]);
  const sys = (systems ?? []).map((s) => ({ id: s.id, name: s.name }));
  return {
    systems: sys,
    services: (services ?? []).map((s) => ({
      id: s.id,
      name: s.name,
      systemId: s.system_id,
      systemName: s.system?.name ?? "—",
      defaultIntervalKm: s.default_interval_km,
      isActive: s.is_active,
    })),
  };
}

type RawOrder = {
  id: string;
  vehicle_id: string;
  performed_at: string | null;
  odometer_km: number;
  reason: string;
  vendor_id: string | null;
  os_ref: string | null;
  cost: number | null;
  notes: string | null;
  vendorRel: { name: string } | null;
  work_order_items: {
    id: string;
    service_id: string | null;
    label: string;
    system_id: number;
    description: string | null;
    next_km: number | null;
    system: { name: string } | null;
    work_order_costs: {
      category: string;
      label: string;
      quantity: number | null;
      unit: string | null;
      cost: number;
    }[];
  }[];
};

function mapOrder(o: RawOrder): WorkOrder {
  const items: WoItem[] = (o.work_order_items ?? []).map((i) => {
    const costs: WoCost[] = (i.work_order_costs ?? []).map((c) => ({
      category: c.category as WoCostCategory,
      label: c.label,
      quantity: c.quantity != null ? Number(c.quantity) : null,
      unit: c.unit,
      cost: Number(c.cost),
    }));
    return {
      id: i.id,
      serviceId: i.service_id,
      label: i.label,
      systemId: i.system_id,
      systemName: i.system?.name ?? "—",
      description: i.description,
      nextKm: i.next_km,
      costs,
      total: costs.reduce((s, c) => s + c.cost, 0),
    };
  });
  return {
    id: o.id,
    performedAt: o.performed_at,
    odometerKm: o.odometer_km,
    reason: o.reason as WorkOrderReason,
    vendorId: o.vendor_id,
    vendorName: o.vendorRel?.name ?? null,
    osRef: o.os_ref,
    notes: o.notes,
    items,
    total: items.reduce((s, i) => s + i.total, 0),
  };
}

const ORDER_SELECT =
  "id, vehicle_id, performed_at, odometer_km, reason, vendor_id, os_ref, cost, notes, " +
  "vendorRel:vendors(name), " +
  "work_order_items(id, service_id, label, system_id, description, next_km, " +
  "system:maintenance_systems(name), work_order_costs(category, label, quantity, unit, cost))";

/**
 * Próximas intervenções a partir dos itens com next_km: para cada serviço
 * (label), vale o registro mais recente (maior km de OS) — uma OS nova do
 * mesmo serviço substitui o alvo antigo.
 */
function computeUpcoming(orders: WorkOrder[], latestKm: number | null): UpcomingItem[] {
  const byLabel = new Map<string, { item: WoItem; orderKm: number }>();
  for (const o of orders) {
    for (const i of o.items) {
      const key = i.label.toLocaleLowerCase();
      const cur = byLabel.get(key);
      if (!cur || o.odometerKm > cur.orderKm) byLabel.set(key, { item: i, orderKm: o.odometerKm });
    }
  }
  return [...byLabel.values()]
    .filter(({ item }) => item.nextKm != null)
    .map(({ item, orderKm }) => {
      const nextKm = item.nextKm as number;
      const remaining = latestKm != null ? nextKm - latestKm : null;
      const { tone, label } = toneFor(remaining, nextKm - orderKm);
      return {
        label: item.label,
        systemName: item.systemName,
        nextKm,
        remainingKm: remaining,
        tone,
        statusLabel: label,
      };
    })
    .sort((a, b) => (a.remainingKm ?? Infinity) - (b.remainingKm ?? Infinity));
}

/** Manutenções de um veículo + próximas intervenções. Cliente de sessão. */
export async function getVehicleMaintenance(vehicleId: string): Promise<VehicleMaintenance> {
  const db = await createClient();
  const [{ data }, { data: oil }, { data: installs }] = await Promise.all([
    db
      .from("work_orders")
      .select(ORDER_SELECT)
      .eq("vehicle_id", vehicleId)
      .order("odometer_km", { ascending: false }),
    db.from("oil_changes").select("odometer_km").eq("vehicle_id", vehicleId),
    db.from("tire_installations").select("installed_km, removed_km").eq("vehicle_id", vehicleId),
  ]);

  const orders = ((data ?? []) as unknown as RawOrder[]).map(mapOrder);

  const kmCandidates: number[] = [
    ...orders.map((o) => o.odometerKm),
    ...(oil ?? []).map((c) => c.odometer_km),
    ...(installs ?? []).flatMap((i) => [i.installed_km, i.removed_km]),
  ].filter((n): n is number => typeof n === "number");
  const latestKm = kmCandidates.length ? Math.max(...kmCandidates) : null;

  return {
    orders,
    upcoming: computeUpcoming(orders, latestKm),
    latestKm,
    totalSpent: orders.reduce((s, o) => s + o.total, 0),
  };
}

export type MaintAnalytics = {
  totalSpent: number;
  orderCount: number;
  avgPerOrder: number;
  partsTotal: number;
  laborTotal: number;
  /** % do custo que foi corretiva + socorro + acidente (meta de mercado: ≤ 25%). */
  correctiveSharePct: number | null;
  bySystem: { name: string; total: number; count: number }[];
  byVendor: { name: string; total: number; count: number }[];
  byVehicle: { vehicleId: string; plate: string; total: number; count: number }[];
  due: {
    vehicleId: string;
    plate: string;
    label: string;
    nextKm: number;
    tone: StatusTone;
    statusLabel: string;
  }[];
};

/** Análise de manutenção da frota inteira (página T.M.A.). Cliente de sessão. */
export async function getMaintAnalytics(): Promise<MaintAnalytics> {
  const db = await createClient();
  const [{ data: orders }, { data: vehicles }, { data: oil }, { data: installs }] =
    await Promise.all([
      db.from("work_orders").select(ORDER_SELECT),
      db.from("vehicles").select("id, plate").is("deleted_at", null),
      db.from("oil_changes").select("vehicle_id, odometer_km"),
      db.from("tire_installations").select("vehicle_id, installed_km, removed_km"),
    ]);

  const plateById = new Map((vehicles ?? []).map((v) => [v.id, v.plate]));
  const raw = (orders ?? []) as unknown as RawOrder[];

  // KM conhecido por veículo (OSs + trocas de óleo + instalações de pneu).
  const kmByVehicle = new Map<string, number>();
  const bump = (vid: string, km: number | null) => {
    if (km == null) return;
    kmByVehicle.set(vid, Math.max(kmByVehicle.get(vid) ?? 0, km));
  };
  for (const o of raw) bump(o.vehicle_id, o.odometer_km);
  for (const c of oil ?? []) bump(c.vehicle_id, c.odometer_km);
  for (const i of installs ?? []) {
    bump(i.vehicle_id, i.installed_km);
    bump(i.vehicle_id, i.removed_km);
  }

  let totalSpent = 0;
  let partsTotal = 0;
  let laborTotal = 0;
  let correctiveSpent = 0;
  const systemMap = new Map<string, { total: number; count: number }>();
  const vendorMap = new Map<string, { total: number; count: number }>();
  const vehicleMap = new Map<string, { total: number; count: number }>();
  const byVehicleOrders = new Map<string, WorkOrder[]>();

  for (const r of raw) {
    const o = mapOrder(r);
    totalSpent += o.total;
    if (o.reason === "corretiva" || o.reason === "socorro" || o.reason === "acidente")
      correctiveSpent += o.total;

    if (o.vendorName) {
      const v = vendorMap.get(o.vendorName) ?? { total: 0, count: 0 };
      v.total += o.total;
      v.count += 1;
      vendorMap.set(o.vendorName, v);
    }
    const ve = vehicleMap.get(r.vehicle_id) ?? { total: 0, count: 0 };
    ve.total += o.total;
    ve.count += 1;
    vehicleMap.set(r.vehicle_id, ve);

    const list = byVehicleOrders.get(r.vehicle_id) ?? [];
    list.push(o);
    byVehicleOrders.set(r.vehicle_id, list);

    for (const i of o.items) {
      const s = systemMap.get(i.systemName) ?? { total: 0, count: 0 };
      s.total += i.total;
      s.count += 1;
      systemMap.set(i.systemName, s);
      for (const c of i.costs) {
        if (c.category === "mao_de_obra") laborTotal += c.cost;
        else partsTotal += c.cost;
      }
    }
  }

  // Próximas intervenções da frota (itens com next_km, mais urgentes primeiro).
  const due: MaintAnalytics["due"] = [];
  for (const [vid, list] of byVehicleOrders) {
    const upcoming = computeUpcoming(list, kmByVehicle.get(vid) ?? null);
    for (const u of upcoming) {
      if (u.tone !== "crit" && u.tone !== "warn") continue;
      due.push({
        vehicleId: vid,
        plate: plateById.get(vid) ?? "—",
        label: u.label,
        nextKm: u.nextKm,
        tone: u.tone,
        statusLabel: u.statusLabel,
      });
    }
  }
  due.sort((a, b) => (a.tone === b.tone ? 0 : a.tone === "crit" ? -1 : 1));

  return {
    totalSpent,
    orderCount: raw.length,
    avgPerOrder: raw.length ? totalSpent / raw.length : 0,
    partsTotal,
    laborTotal,
    correctiveSharePct: totalSpent > 0 ? (correctiveSpent / totalSpent) * 100 : null,
    bySystem: [...systemMap.entries()]
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.total - a.total),
    byVendor: [...vendorMap.entries()]
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.total - a.total),
    byVehicle: [...vehicleMap.entries()]
      .map(([vehicleId, v]) => ({ vehicleId, plate: plateById.get(vehicleId) ?? "—", ...v }))
      .sort((a, b) => b.total - a.total),
    due,
  };
}
