import { createClient } from "@/lib/supabase/server";
import {
  treadTone,
  positionCode,
  positionLabel,
  axlePositions,
  TIRE_STATUS_LABEL,
  type AxleKind,
  type TireStatus,
} from "@/lib/tires";
import { getTireThresholds } from "@/lib/data/settings";
import type { StatusTone } from "@/lib/status";

export type TireListItem = {
  id: string;
  fireNumber: string;
  brand: string | null;
  model: string | null;
  size: string;
  life: number;
  status: TireStatus;
  statusLabel: string;
  treadMm: number | null;
  treadTone: StatusTone;
  measuredAt: string | null;
  vehiclePlate: string | null;
  vehicleId: string | null;
  position: string | null;
};

type ReadingRow = { tire_id: string; tread_mm: number; measured_at: string };

/** Última aferição por pneu (reduz em JS — frota pequena). */
function latestByTire(readings: ReadingRow[]): Map<string, ReadingRow> {
  const map = new Map<string, ReadingRow>();
  for (const r of readings) {
    const cur = map.get(r.tire_id);
    if (!cur || r.measured_at > cur.measured_at) map.set(r.tire_id, r);
  }
  return map;
}

/** Todos os pneus (página /pneus). Cliente de sessão (staff via RLS). */
export async function getTireList(): Promise<TireListItem[]> {
  const db = await createClient();
  const thresholds = await getTireThresholds();
  const { data: tires, error } = await db
    .from("tires")
    .select(
      `id, fire_number, brand, model, size, current_life, status,
       installs:tire_installations(vehicle_id, axle_number, side, dual_pos, removed_at,
         vehicle:vehicles(plate))`,
    )
    .is("deleted_at", null)
    .order("fire_number");
  if (error) throw new Error(`getTireList: ${error.message}`);

  const ids = (tires ?? []).map((t) => t.id);
  let latest = new Map<string, ReadingRow>();
  if (ids.length > 0) {
    const { data: readings } = await db
      .from("tire_readings")
      .select("tire_id, tread_mm, measured_at")
      .in("tire_id", ids);
    latest = latestByTire((readings ?? []) as ReadingRow[]);
  }

  return (tires ?? [])
    .map((t) => {
      const active = (t.installs ?? []).find((i) => i.removed_at === null) ?? null;
      const reading = latest.get(t.id) ?? null;
      return {
        id: t.id,
        fireNumber: t.fire_number,
        brand: t.brand,
        model: t.model,
        size: t.size,
        life: t.current_life,
        status: t.status,
        statusLabel: TIRE_STATUS_LABEL[t.status],
        treadMm: reading ? Number(reading.tread_mm) : null,
        treadTone: treadTone(reading ? Number(reading.tread_mm) : null, thresholds).tone,
        measuredAt: reading?.measured_at ?? null,
        vehiclePlate: active?.vehicle?.plate ?? null,
        vehicleId: active?.vehicle_id ?? null,
        position: active ? positionCode(active.axle_number, active.side, active.dual_pos) : null,
      };
    })
    .sort(
      (a, b) =>
        Number(a.fireNumber) - Number(b.fireNumber) || a.fireNumber.localeCompare(b.fireNumber),
    );
}

export type RodadoTire = {
  tireId: string;
  installationId: string;
  fireNumber: string;
  brand: string | null;
  model: string | null;
  size: string;
  life: number;
  treadMm: number | null;
  treadNewMm: number | null;
  tone: StatusTone;
  toneLabel: string;
  measuredAt: string | null;
  installedAt: string;
  installedKm: number | null;
};

export type RodadoPosition = {
  axleNumber: number;
  side: "E" | "D";
  dualPos: "I" | "E" | null;
  code: string;
  label: string;
  tire: RodadoTire | null;
};

export type RodadoAxle = {
  number: number;
  kind: AxleKind;
  dual: boolean;
  positions: RodadoPosition[];
};

export type VehicleRodado = {
  vehicleId: string;
  plate: string;
  vehicleType: string;
  axles: RodadoAxle[];
  configured: boolean; // tem layout de eixos?
};

/** Rodado completo de um veículo: eixos + pneus instalados + última aferição. */
export async function getVehicleRodado(vehicleId: string): Promise<VehicleRodado | null> {
  const db = await createClient();
  const thresholds = await getTireThresholds();

  const { data: v } = await db
    .from("vehicles")
    .select("id, plate, vehicle_type")
    .eq("id", vehicleId)
    .maybeSingle();
  if (!v) return null;

  const { data: axles } = await db
    .from("vehicle_axles")
    .select("axle_number, kind, dual")
    .eq("vehicle_id", vehicleId)
    .order("axle_number");

  const { data: installs } = await db
    .from("tire_installations")
    .select(
      `id, axle_number, side, dual_pos, installed_at, installed_km,
       tire:tires(id, fire_number, brand, model, size, current_life, tread_new_mm)`,
    )
    .eq("vehicle_id", vehicleId)
    .is("removed_at", null);

  const tireIds = (installs ?? []).map((i) => i.tire?.id).filter((x): x is string => !!x);
  let latest = new Map<string, ReadingRow>();
  if (tireIds.length > 0) {
    const { data: readings } = await db
      .from("tire_readings")
      .select("tire_id, tread_mm, measured_at")
      .in("tire_id", tireIds);
    latest = latestByTire((readings ?? []) as ReadingRow[]);
  }

  const rodadoAxles: RodadoAxle[] = (axles ?? []).map((a) => ({
    number: a.axle_number,
    kind: a.kind,
    dual: a.dual,
    positions: axlePositions(a.dual).map((p) => {
      const inst =
        (installs ?? []).find(
          (i) =>
            i.axle_number === a.axle_number &&
            i.side === p.side &&
            (i.dual_pos ?? null) === p.dualPos,
        ) ?? null;
      let tire: RodadoTire | null = null;
      if (inst?.tire) {
        const reading = latest.get(inst.tire.id) ?? null;
        const tread = reading ? Number(reading.tread_mm) : null;
        const tt = treadTone(tread, thresholds);
        tire = {
          tireId: inst.tire.id,
          installationId: inst.id,
          fireNumber: inst.tire.fire_number,
          brand: inst.tire.brand,
          model: inst.tire.model,
          size: inst.tire.size,
          life: inst.tire.current_life,
          treadMm: tread,
          treadNewMm: inst.tire.tread_new_mm != null ? Number(inst.tire.tread_new_mm) : null,
          tone: tt.tone,
          toneLabel: tt.label,
          measuredAt: reading?.measured_at ?? null,
          installedAt: inst.installed_at,
          installedKm: inst.installed_km,
        };
      }
      return {
        axleNumber: a.axle_number,
        side: p.side,
        dualPos: p.dualPos,
        code: positionCode(a.axle_number, p.side, p.dualPos),
        label: positionLabel(a.kind, a.axle_number, p.side, p.dualPos),
        tire,
      };
    }),
  }));

  return {
    vehicleId: v.id,
    plate: v.plate,
    vehicleType: v.vehicle_type,
    axles: rodadoAxles,
    configured: (axles ?? []).length > 0,
  };
}

export type StockTire = {
  id: string;
  fireNumber: string;
  brand: string | null;
  model: string | null;
  size: string;
  life: number;
  treadMm: number | null;
};

/** Pneus disponíveis em estoque (para o dialog de instalação). */
export async function getStockTires(): Promise<StockTire[]> {
  const db = await createClient();
  const { data: tires, error } = await db
    .from("tires")
    .select("id, fire_number, brand, model, size, current_life")
    .eq("status", "estoque")
    .is("deleted_at", null)
    .order("fire_number");
  if (error) throw new Error(`getStockTires: ${error.message}`);

  const ids = (tires ?? []).map((t) => t.id);
  let latest = new Map<string, ReadingRow>();
  if (ids.length > 0) {
    const { data: readings } = await db
      .from("tire_readings")
      .select("tire_id, tread_mm, measured_at")
      .in("tire_id", ids);
    latest = latestByTire((readings ?? []) as ReadingRow[]);
  }

  return (tires ?? []).map((t) => ({
    id: t.id,
    fireNumber: t.fire_number,
    brand: t.brand,
    model: t.model,
    size: t.size,
    life: t.current_life,
    treadMm: latest.get(t.id) ? Number(latest.get(t.id)!.tread_mm) : null,
  }));
}

/* ---------------- Linha da vida (detalhe do pneu) ---------------- */

export type TireTimelineEvent = {
  /** instalacao | remocao | afericao | recapagem | conserto | sucateamento | venda | compra */
  kind: string;
  date: string; // ISO
  title: string;
  detail: string | null;
  cost: number | null;
};

export type TireDetail = {
  id: string;
  fireNumber: string;
  brand: string | null;
  model: string | null;
  size: string;
  life: number;
  status: TireStatus;
  statusLabel: string;
  treadMm: number | null;
  treadNewMm: number | null;
  tone: StatusTone;
  toneLabel: string;
  purchaseDate: string | null;
  purchaseValue: number | null;
  notes: string | null;
  /** Onde está agora (se em uso). */
  vehicleId: string | null;
  vehiclePlate: string | null;
  position: string | null;
  /** Km somada das instalações fechadas (com km registrada). */
  kmTracked: number;
  /** Compra + recapagens + consertos. */
  totalCost: number;
  timeline: TireTimelineEvent[];
  readings: { measuredAt: string; treadMm: number }[];
};

/** Detalhe completo do pneu: identidade, situação e a linha da vida. */
export async function getTireDetail(id: string): Promise<TireDetail | null> {
  const db = await createClient();
  const thresholds = await getTireThresholds();

  const { data: t } = await db
    .from("tires")
    .select(
      "id, fire_number, brand, model, size, current_life, status, tread_new_mm, purchase_date, purchase_value, notes",
    )
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (!t) return null;

  const [{ data: installs }, { data: readings }, { data: events }] = await Promise.all([
    db
      .from("tire_installations")
      .select(
        "vehicle_id, axle_number, side, dual_pos, installed_at, installed_km, removed_at, removed_km, vehicle:vehicles(plate)",
      )
      .eq("tire_id", id)
      .order("installed_at", { ascending: false }),
    db
      .from("tire_readings")
      .select("measured_at, tread_mm, pressure_psi, vehicle_km")
      .eq("tire_id", id)
      .order("measured_at", { ascending: false }),
    db
      .from("tire_events")
      .select("event_type, event_date, cost, vendor, new_tread_mm, notes")
      .eq("tire_id", id)
      .order("event_date", { ascending: false }),
  ]);

  const active = (installs ?? []).find((i) => i.removed_at === null) ?? null;
  const lastReading = (readings ?? [])[0] ?? null;
  const tread = lastReading ? Number(lastReading.tread_mm) : null;
  const tt = treadTone(tread, thresholds);

  const kmTracked = (installs ?? []).reduce((sum, i) => {
    if (i.removed_km != null && i.installed_km != null && i.removed_km > i.installed_km) {
      return sum + (i.removed_km - i.installed_km);
    }
    return sum;
  }, 0);

  const totalCost =
    (t.purchase_value != null ? Number(t.purchase_value) : 0) +
    (events ?? []).reduce((s, e) => s + (e.cost != null ? Number(e.cost) : 0), 0);

  const fmtKm = (v: number | null) => (v != null ? `${v.toLocaleString("pt-BR")} km` : null);

  const timeline: TireTimelineEvent[] = [];
  for (const i of installs ?? []) {
    const pos = positionCode(i.axle_number, i.side, i.dual_pos);
    timeline.push({
      kind: "instalacao",
      date: i.installed_at,
      title: `Instalado em ${i.vehicle?.plate ?? "?"} · ${pos}`,
      detail: fmtKm(i.installed_km),
      cost: null,
    });
    if (i.removed_at) {
      timeline.push({
        kind: "remocao",
        date: i.removed_at,
        title: `Removido de ${i.vehicle?.plate ?? "?"} · ${pos}`,
        detail: fmtKm(i.removed_km),
        cost: null,
      });
    }
  }
  for (const r of readings ?? []) {
    timeline.push({
      kind: "afericao",
      date: r.measured_at,
      title: `Aferição: ${String(Number(r.tread_mm)).replace(".", ",")} mm`,
      detail: r.pressure_psi != null ? `${r.pressure_psi} psi` : null,
      cost: null,
    });
  }
  for (const e of events ?? []) {
    const titles: Record<string, string> = {
      recapagem: "Recapagem",
      conserto: "Conserto",
      sucateamento: "Sucateado",
      venda: "Vendido",
    };
    timeline.push({
      kind: e.event_type,
      date: e.event_date,
      title:
        e.event_type === "recapagem" && e.new_tread_mm != null
          ? `Recapagem — sulco novo ${String(Number(e.new_tread_mm)).replace(".", ",")} mm`
          : (titles[e.event_type] ?? e.event_type),
      detail: [e.vendor, e.notes].filter(Boolean).join(" · ") || null,
      cost: e.cost != null ? Number(e.cost) : null,
    });
  }
  if (t.purchase_date) {
    timeline.push({
      kind: "compra",
      date: t.purchase_date,
      title: "Compra",
      detail: null,
      cost: t.purchase_value != null ? Number(t.purchase_value) : null,
    });
  }
  timeline.sort((a, b) => (a.date < b.date ? 1 : -1));

  return {
    id: t.id,
    fireNumber: t.fire_number,
    brand: t.brand,
    model: t.model,
    size: t.size,
    life: t.current_life,
    status: t.status,
    statusLabel: TIRE_STATUS_LABEL[t.status],
    treadMm: tread,
    treadNewMm: t.tread_new_mm != null ? Number(t.tread_new_mm) : null,
    tone: tt.tone,
    toneLabel: tt.label,
    purchaseDate: t.purchase_date,
    purchaseValue: t.purchase_value != null ? Number(t.purchase_value) : null,
    notes: t.notes,
    vehicleId: active?.vehicle_id ?? null,
    vehiclePlate: active?.vehicle?.plate ?? null,
    position: active ? positionCode(active.axle_number, active.side, active.dual_pos) : null,
    kmTracked,
    totalCost,
    timeline,
    readings: (readings ?? []).map((r) => ({
      measuredAt: r.measured_at,
      treadMm: Number(r.tread_mm),
    })),
  };
}
