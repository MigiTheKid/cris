import { createClient } from "@/lib/supabase/server";
import {
  treadTone,
  positionCode,
  positionLabel,
  axlePositions,
  TIRE_STATUS_LABEL,
  MAX_RECAP_LIVES,
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

/* ---------------- Análise / inteligência (Fase 3) ---------------- */

export type BrandCpk = {
  brand: string;
  count: number; // pneus dessa marca
  kmWithData: number; // km somada dos pneus com dado
  costWithData: number; // custo somado dos mesmos
  cpk: number | null; // R$/km ponderado (null = sem km/custo)
};

export type DecisionTire = {
  tireId: string;
  fireNumber: string;
  brand: string | null;
  size: string;
  life: number;
  treadMm: number | null;
  tone: StatusTone;
  vehicleId: string | null;
  vehiclePlate: string | null;
  position: string | null;
};

export type TireAnalytics = {
  fleet: {
    total: number;
    inUse: number;
    totalInvested: number; // compra + recapes + consertos de todos
    fleetCpk: number | null; // R$/km ponderado da frota
    tiresWithCpk: number;
    avgWearPer1000: number | null; // mm gastos por 1.000 km (média)
  };
  byBrand: BrandCpk[]; // ordenado do melhor (menor CPK) ao pior
  lives: { l1: number; l2: number; l3plus: number };
  decision: {
    recap: DecisionTire[]; // janela de recape, carcaça ainda boa (vida < máx)
    buy: DecisionTire[]; // janela/abaixo, carcaça no fim (vida >= máx)
  };
};

/** Indicadores estratégicos dos pneus (CPK, decisão de compra, vidas). */
export async function getTireAnalytics(): Promise<TireAnalytics> {
  const db = await createClient();
  const thresholds = await getTireThresholds();

  const [{ data: tires }, { data: installs }, { data: events }, { data: readings }] =
    await Promise.all([
      db
        .from("tires")
        .select("id, fire_number, brand, size, current_life, status, tread_new_mm, purchase_value")
        .is("deleted_at", null),
      db
        .from("tire_installations")
        .select(
          "tire_id, vehicle_id, axle_number, side, dual_pos, installed_km, removed_km, removed_at, vehicle:vehicles(plate)",
        ),
      db.from("tire_events").select("tire_id, cost"),
      db.from("tire_readings").select("tire_id, tread_mm, measured_at, vehicle_km"),
    ]);

  // Indexa por pneu.
  const installsBy = new Map<string, NonNullable<typeof installs>>();
  for (const i of installs ?? []) {
    const arr = installsBy.get(i.tire_id) ?? [];
    arr.push(i);
    installsBy.set(i.tire_id, arr);
  }
  const costBy = new Map<string, number>();
  for (const e of events ?? []) {
    if (e.cost != null) costBy.set(e.tire_id, (costBy.get(e.tire_id) ?? 0) + Number(e.cost));
  }
  const readingsBy = new Map<string, NonNullable<typeof readings>>();
  for (const r of readings ?? []) {
    const arr = readingsBy.get(r.tire_id) ?? [];
    arr.push(r);
    readingsBy.set(r.tire_id, arr);
  }

  let totalInvested = 0;
  let fleetKm = 0;
  let fleetCost = 0;
  let tiresWithCpk = 0;
  const wearRates: number[] = [];
  const lives = { l1: 0, l2: 0, l3plus: 0 };
  const brandAgg = new Map<string, { count: number; km: number; cost: number; withData: number }>();
  const recap: DecisionTire[] = [];
  const buy: DecisionTire[] = [];
  let inUse = 0;

  for (const t of tires ?? []) {
    const tInstalls = installsBy.get(t.id) ?? [];
    const tReadings = (readingsBy.get(t.id) ?? [])
      .slice()
      .sort((a, b) => (a.measured_at < b.measured_at ? -1 : 1));
    const cost =
      (t.purchase_value != null ? Number(t.purchase_value) : 0) + (costBy.get(t.id) ?? 0);
    totalInvested += cost;

    // Km rastreada: instalações fechadas + trecho da instalação ativa (via última aferição c/ km).
    let km = 0;
    for (const i of tInstalls) {
      if (i.removed_km != null && i.installed_km != null && i.removed_km > i.installed_km) {
        km += i.removed_km - i.installed_km;
      }
    }
    const active = tInstalls.find((i) => i.removed_at === null) ?? null;
    if (active?.installed_km != null) {
      const lastKm = [...tReadings].reverse().find((r) => r.vehicle_km != null)?.vehicle_km ?? null;
      if (lastKm != null && lastKm > active.installed_km) km += lastKm - active.installed_km;
    }

    // CPK do pneu (precisa de km e custo).
    if (km > 0 && cost > 0) {
      fleetKm += km;
      fleetCost += cost;
      tiresWithCpk += 1;
    }

    // Taxa de desgaste (mm / 1.000 km), quando há base.
    const withKm = tReadings.filter((r) => r.vehicle_km != null);
    if (withKm.length >= 2) {
      const first = withKm[0];
      const last = withKm[withKm.length - 1];
      const dKm = (last.vehicle_km as number) - (first.vehicle_km as number);
      const dTread = Number(first.tread_mm) - Number(last.tread_mm);
      if (dKm > 0 && dTread > 0) wearRates.push((dTread / dKm) * 1000);
    } else if (withKm.length === 1 && active?.installed_km != null && t.tread_new_mm != null) {
      const r = withKm[0];
      const dKm = (r.vehicle_km as number) - active.installed_km;
      const dTread = Number(t.tread_new_mm) - Number(r.tread_mm);
      if (dKm > 0 && dTread > 0) wearRates.push((dTread / dKm) * 1000);
    }

    // Vidas.
    if (t.current_life <= 1) lives.l1 += 1;
    else if (t.current_life === 2) lives.l2 += 1;
    else lives.l3plus += 1;

    // Marca.
    const brand = t.brand?.trim() || "Sem marca";
    const agg = brandAgg.get(brand) ?? { count: 0, km: 0, cost: 0, withData: 0 };
    agg.count += 1;
    if (km > 0 && cost > 0) {
      agg.km += km;
      agg.cost += cost;
      agg.withData += 1;
    }
    brandAgg.set(brand, agg);

    // Decisão (só pneus montados com sulco na janela ou abaixo).
    if (t.status === "em_uso") {
      inUse += 1;
      const lastReading = tReadings[tReadings.length - 1] ?? null;
      const tread = lastReading ? Number(lastReading.tread_mm) : null;
      if (tread != null && tread < thresholds.okMm) {
        const d: DecisionTire = {
          tireId: t.id,
          fireNumber: t.fire_number,
          brand: t.brand,
          size: t.size,
          life: t.current_life,
          treadMm: tread,
          tone: treadTone(tread, thresholds).tone,
          vehicleId: active?.vehicle_id ?? null,
          vehiclePlate: active?.vehicle?.plate ?? null,
          position: active ? positionCode(active.axle_number, active.side, active.dual_pos) : null,
        };
        if (t.current_life >= MAX_RECAP_LIVES) buy.push(d);
        else recap.push(d);
      }
    }
  }

  const byBrand: BrandCpk[] = [...brandAgg.entries()]
    .map(([brand, a]) => ({
      brand,
      count: a.count,
      kmWithData: a.km,
      costWithData: a.cost,
      cpk: a.km > 0 ? a.cost / a.km : null,
    }))
    .sort((a, b) => {
      if (a.cpk == null) return 1;
      if (b.cpk == null) return -1;
      return a.cpk - b.cpk;
    });

  const sortByUrgency = (a: DecisionTire, b: DecisionTire) => (a.treadMm ?? 99) - (b.treadMm ?? 99);

  return {
    fleet: {
      total: (tires ?? []).length,
      inUse,
      totalInvested,
      fleetCpk: fleetKm > 0 ? fleetCost / fleetKm : null,
      tiresWithCpk,
      avgWearPer1000:
        wearRates.length > 0 ? wearRates.reduce((s, w) => s + w, 0) / wearRates.length : null,
    },
    byBrand,
    lives,
    decision: { recap: recap.sort(sortByUrgency), buy: buy.sort(sortByUrgency) },
  };
}
