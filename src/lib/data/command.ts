import { createClient } from "@/lib/supabase/server";
import { expiryStatus, daysUntil, worstExpiryStatus } from "@/lib/expiry";
import { statusTone, type StatusTone } from "@/lib/status";
import { vehicleTypeLabel, companyLabel } from "@/lib/labels";

export type AlertItem = {
  docLabel: string;
  plate: string;
  model: string | null;
  typeLabel: string;
  days: number;
};
export type PulseItem = {
  plate: string;
  driverFirst: string | null;
  driverName: string | null;
  model: string | null;
  typeLabel: string;
  tone: StatusTone;
  fill: number;
  worstDocLabel: string | null;
  worstDays: number | null;
};
export type FleetCardItem = {
  id: string;
  plate: string;
  model: string | null;
  typeLabel: string;
  year: number | null;
  companyLabel: string;
  driverName: string | null;
  tone: StatusTone;
  statusLabel: string;
  critCount: number;
  attnCount: number;
  docTotal: number;
};
export type CrewItem = { id: string; name: string; vehiclePlate: string | null; tone: StatusTone };

export type CommandCenter = {
  conformidadePct: number;
  total: number;
  counts: Record<StatusTone, number>;
  criticos: number;
  vencendo15: number;
  vencendo30: number;
  vehCrit: number;
  drvCrit: number;
  alerts: AlertItem[];
  pulse: PulseItem[];
  fleet: FleetCardItem[];
  crew: CrewItem[];
};

const FILL: Record<StatusTone, number> = { ok: 100, warn: 80, alert: 60, crit: 40, idle: 55 };

/** Tudo que o Painel (Centro de Comando) precisa. TEMPORÁRIO: cliente admin (sem RLS). */
export async function getCommandCenter(): Promise<CommandCenter> {
  const db = await createClient();

  const { data: vData, error } = await db
    .from("vehicles")
    .select(
      `id, plate, model, vehicle_type, year,
       company:companies(kind),
       assignments:vehicle_assignments(driver_id, unassigned_at),
       documents:vehicle_documents(doc_type, expires_at, deleted_at, dt:document_types(label))`,
    )
    .is("deleted_at", null)
    .order("plate");
  if (error) throw new Error(`getCommandCenter: ${error.message}`);
  const vehicles = vData ?? [];

  // nomes de motoristas atribuídos
  const driverIdByVehicle = new Map<string, string>();
  for (const v of vehicles) {
    const id = v.assignments?.find((a) => a.unassigned_at === null)?.driver_id;
    if (id) driverIdByVehicle.set(v.id, id);
  }
  const { data: drivers } = await db
    .from("profiles")
    .select("id, full_name")
    .eq("role", "driver")
    .eq("is_active", true)
    .order("full_name");
  const nameById = new Map((drivers ?? []).map((d) => [d.id, d.full_name]));

  const counts: Record<StatusTone, number> = { ok: 0, warn: 0, alert: 0, crit: 0, idle: 0 };
  const alerts: AlertItem[] = [];
  const pulse: PulseItem[] = [];
  const fleet: FleetCardItem[] = [];
  let criticos = 0;
  let vencendo15 = 0;
  let vencendo30 = 0;
  let vehCrit = 0;

  for (const v of vehicles) {
    const docs = (v.documents ?? []).filter((d) => !d.deleted_at);
    const perDoc = docs.map((d) => {
      const date = d.expires_at ? new Date(d.expires_at) : null;
      return { docLabel: d.dt?.label ?? d.doc_type, date, status: expiryStatus(date) };
    });
    const worst = worstExpiryStatus(perDoc.map((d) => d.status));
    const { tone, label } = statusTone(worst);
    counts[tone] += 1;
    if (tone === "crit") vehCrit += 1;

    let critCount = 0;
    let attnCount = 0;
    const driverId = driverIdByVehicle.get(v.id) ?? null;
    const driverName = driverId ? (nameById.get(driverId) ?? null) : null;
    const typeLabel = vehicleTypeLabel(v.vehicle_type);

    for (const d of perDoc) {
      const t = statusTone(d.status).tone;
      if (t === "crit") {
        critCount += 1;
        criticos += 1;
        if (d.date)
          alerts.push({
            docLabel: d.docLabel,
            plate: v.plate,
            model: v.model,
            typeLabel,
            days: daysUntil(d.date),
          });
      } else if (t === "warn" || t === "alert") {
        attnCount += 1;
      }
      if (d.date) {
        const days = daysUntil(d.date);
        if (days >= 0 && days <= 15) vencendo15 += 1;
        if (days >= 0 && days <= 30) vencendo30 += 1;
      }
    }

    // Pior documento (menor nº de dias) para o popover do pulso.
    let worstDoc: { docLabel: string; days: number } | null = null;
    for (const d of perDoc) {
      if (!d.date) continue;
      const days = daysUntil(d.date);
      if (worstDoc === null || days < worstDoc.days) worstDoc = { docLabel: d.docLabel, days };
    }
    pulse.push({
      plate: v.plate,
      driverFirst: driverName ? driverName.split(" ")[0] : null,
      driverName,
      model: v.model,
      typeLabel,
      tone,
      fill: FILL[tone],
      worstDocLabel: worstDoc ? worstDoc.docLabel : null,
      worstDays: worstDoc ? worstDoc.days : null,
    });
    fleet.push({
      id: v.id,
      plate: v.plate,
      model: v.model,
      typeLabel,
      year: v.year,
      companyLabel: companyLabel(v.company?.kind ?? "top_diesel"),
      driverName,
      tone,
      statusLabel: label,
      critCount,
      attnCount,
      docTotal: perDoc.length,
    });
  }

  alerts.sort((a, b) => a.days - b.days);

  // crew (motoristas) com veículo atribuído
  const plateByDriver = new Map<string, string>();
  for (const v of vehicles) {
    const id = driverIdByVehicle.get(v.id);
    if (id) plateByDriver.set(id, v.plate);
  }
  const crew: CrewItem[] = (drivers ?? []).map((d) => ({
    id: d.id,
    name: d.full_name,
    vehiclePlate: plateByDriver.get(d.id) ?? null,
    tone: "idle" as StatusTone, // documentos de motorista ainda não cadastrados
  }));

  const total = vehicles.length;
  const conformidadePct = total > 0 ? Math.round((counts.ok / total) * 100) : 0;

  return {
    conformidadePct,
    total,
    counts,
    criticos,
    vencendo15,
    vencendo30,
    vehCrit,
    drvCrit: 0,
    alerts,
    pulse,
    fleet,
    crew,
  };
}
