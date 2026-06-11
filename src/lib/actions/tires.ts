"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";
import type { AxleKind, TireStatus } from "@/lib/tires";

export type TireFormState = { error?: string; ok?: boolean };

const nowIso = () => new Date().toISOString();

function revalidateTires(vehicleId?: string | null) {
  revalidatePath("/pneus");
  if (vehicleId) revalidatePath(`/frota/${vehicleId}`);
  revalidatePath("/frota");
}

function num(v: FormDataEntryValue | null): number | null {
  const s = String(v ?? "")
    .trim()
    .replace(",", ".");
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** Cria ou edita um pneu (identidade = nº de fogo). */
export async function saveTire(_prev: TireFormState, formData: FormData): Promise<TireFormState> {
  const id = String(formData.get("id") ?? "").trim();
  const fireNumber = String(formData.get("fireNumber") ?? "").trim();
  const brand = String(formData.get("brand") ?? "").trim() || null;
  const model = String(formData.get("model") ?? "").trim() || null;
  const size = String(formData.get("size") ?? "").trim();
  const treadNewMm = num(formData.get("treadNewMm"));
  const purchaseDate = String(formData.get("purchaseDate") ?? "").trim() || null;
  const purchaseValue = num(formData.get("purchaseValue"));
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!fireNumber) return { error: "Informe o nº de fogo." };
  if (!size) return { error: "Informe a medida (ex.: 295/80 R22.5)." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada. Entre novamente." };

  const payload = {
    fire_number: fireNumber,
    brand,
    model,
    size,
    tread_new_mm: treadNewMm,
    purchase_date: purchaseDate,
    purchase_value: purchaseValue,
    notes,
  };

  const { error } = id
    ? await supabase.from("tires").update(payload).eq("id", id)
    : await supabase.from("tires").insert({ ...payload, created_by: user.id });
  if (error) {
    if (error.message.includes("tires_fire_number_key"))
      return { error: `Já existe um pneu com o fogo ${fireNumber}.` };
    return { error: `Não foi possível salvar: ${error.message}` };
  }

  await logAudit({
    action: id ? "update" : "create",
    entity: "tire",
    entityId: fireNumber,
    detail: { fogo: fireNumber, size },
  });
  revalidateTires();
  return { ok: true };
}

/**
 * Exclui PERMANENTEMENTE um pneu do cadastro. Só conclui se o pneu não tiver
 * histórico — instalações/aferições/eventos usam ON DELETE RESTRICT, então o
 * banco bloqueia e preservamos o histórico. Serve para apagar cadastros errados.
 */
export async function deleteTire(tireId: string): Promise<TireFormState> {
  if (!tireId) return { error: "Pneu inválido." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada. Entre novamente." };

  const { data: tire } = await supabase
    .from("tires")
    .select("fire_number")
    .eq("id", tireId)
    .maybeSingle();

  const { error } = await supabase.from("tires").delete().eq("id", tireId);
  if (error) {
    console.error("deleteTire:", error.message);
    return {
      error:
        "Não foi possível excluir — este pneu já tem histórico (instalação, aferição ou eventos). " +
        "A exclusão serve para cadastros feitos por engano; os com histórico ficam preservados.",
    };
  }

  await logAudit({
    action: "delete",
    entity: "tire",
    entityId: tire?.fire_number ?? tireId,
    detail: { fogo: tire?.fire_number },
  });
  revalidateTires();
  return { ok: true };
}

/** Define o layout de eixos do veículo (substitui o atual). */
export async function saveAxleLayout(
  _prev: TireFormState,
  formData: FormData,
): Promise<TireFormState> {
  const vehicleId = String(formData.get("vehicleId") ?? "").trim();
  const axlesRaw = String(formData.get("axles") ?? "").trim(); // "kind:dual,kind:dual,…"
  if (!vehicleId) return { error: "Veículo inválido." };

  const axles = axlesRaw
    .split(",")
    .filter(Boolean)
    .map((part, i) => {
      const [kind, dual] = part.split(":");
      return { axle_number: i + 1, kind: kind as AxleKind, dual: dual === "1" };
    });
  if (axles.length === 0) return { error: "Defina ao menos um eixo." };
  if (axles.length > 6) return { error: "Máximo de 6 eixos." };

  const supabase = await createClient();

  // Bloqueia se houver pneu instalado em eixo que deixaria de existir / viraria simples.
  const { data: active } = await supabase
    .from("tire_installations")
    .select("axle_number, dual_pos")
    .eq("vehicle_id", vehicleId)
    .is("removed_at", null);
  for (const inst of active ?? []) {
    const axle = axles.find((a) => a.axle_number === inst.axle_number);
    if (!axle || (inst.dual_pos !== null && !axle.dual)) {
      return {
        error: `Há pneu instalado no eixo ${inst.axle_number}. Remova os pneus antes de mudar o layout.`,
      };
    }
  }

  const { error: delErr } = await supabase
    .from("vehicle_axles")
    .delete()
    .eq("vehicle_id", vehicleId);
  if (delErr) return { error: `Não foi possível atualizar: ${delErr.message}` };

  const { error: insErr } = await supabase
    .from("vehicle_axles")
    .insert(axles.map((a) => ({ ...a, vehicle_id: vehicleId })));
  if (insErr) return { error: `Não foi possível salvar o layout: ${insErr.message}` };

  await logAudit({
    action: "update",
    entity: "vehicle",
    entityId: vehicleId,
    detail: { axles: axles.length },
  });
  revalidateTires(vehicleId);
  return { ok: true };
}

/** Instala um pneu do estoque numa posição do veículo. */
export async function installTire(
  _prev: TireFormState,
  formData: FormData,
): Promise<TireFormState> {
  const tireId = String(formData.get("tireId") ?? "").trim();
  const vehicleId = String(formData.get("vehicleId") ?? "").trim();
  const axleNumber = Number(formData.get("axleNumber"));
  const side = String(formData.get("side") ?? "");
  const dualPosRaw = String(formData.get("dualPos") ?? "");
  const dualPos = dualPosRaw === "I" || dualPosRaw === "E" ? dualPosRaw : null;
  const vehicleKm = num(formData.get("vehicleKm"));

  if (!tireId) return { error: "Selecione o pneu." };
  if (!vehicleId || !Number.isInteger(axleNumber) || !["E", "D"].includes(side))
    return { error: "Posição inválida." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada. Entre novamente." };

  const { error } = await supabase.from("tire_installations").insert({
    tire_id: tireId,
    vehicle_id: vehicleId,
    axle_number: axleNumber,
    side,
    dual_pos: dualPos,
    installed_km: vehicleKm,
    created_by: user.id,
  });
  if (error) {
    if (error.message.includes("uniq_active_install_per_tire"))
      return { error: "Este pneu já está instalado em outra posição." };
    if (error.message.includes("uniq_active_install_per_position"))
      return { error: "Esta posição já está ocupada." };
    return { error: `Não foi possível instalar: ${error.message}` };
  }

  const { data: tire } = await supabase
    .from("tires")
    .update({ status: "em_uso" })
    .eq("id", tireId)
    .select("fire_number")
    .single();

  await logAudit({
    action: "install",
    entity: "tire",
    entityId: tire?.fire_number ?? tireId,
    detail: {
      fogo: tire?.fire_number,
      vehicleId,
      position: `${axleNumber}${side}${dualPos ?? ""}`,
    },
  });
  revalidateTires(vehicleId);
  return { ok: true };
}

/** Remove um pneu da posição (destino: estoque, recapadora, conserto ou sucata). */
export async function removeTire(_prev: TireFormState, formData: FormData): Promise<TireFormState> {
  const installationId = String(formData.get("installationId") ?? "").trim();
  const destination = String(formData.get("destination") ?? "estoque") as TireStatus;
  const vehicleKm = num(formData.get("vehicleKm"));
  if (!installationId) return { error: "Instalação inválida." };
  if (!["estoque", "recapagem", "conserto", "sucateado"].includes(destination))
    return { error: "Destino inválido." };

  const supabase = await createClient();

  const { data: inst, error: instErr } = await supabase
    .from("tire_installations")
    .update({ removed_at: nowIso(), removed_km: vehicleKm })
    .eq("id", installationId)
    .is("removed_at", null)
    .select("tire_id, vehicle_id")
    .single();
  if (instErr || !inst) return { error: "Não foi possível remover (já removido?)." };

  const { data: tire } = await supabase
    .from("tires")
    .update({ status: destination })
    .eq("id", inst.tire_id)
    .select("fire_number")
    .single();

  // Sucateamento registra o motivo na linha da vida (causa-raiz nas análises).
  if (destination === "sucateado") {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const reason = String(formData.get("reason") ?? "").trim() || null;
    await supabase.from("tire_events").insert({
      tire_id: inst.tire_id,
      event_type: "sucateamento",
      notes: reason,
      created_by: user?.id ?? null,
    });
  }

  await logAudit({
    action: "remove",
    entity: "tire",
    entityId: tire?.fire_number ?? inst.tire_id,
    detail: { fogo: tire?.fire_number, destination },
  });
  revalidateTires(inst.vehicle_id);
  return { ok: true };
}

/** Rodízio: move o pneu para outra posição (troca, se ocupada). Atômico via RPC. */
export async function moveTire(_prev: TireFormState, formData: FormData): Promise<TireFormState> {
  const installationId = String(formData.get("installationId") ?? "").trim();
  const targetVehicleId = String(formData.get("targetVehicleId") ?? "").trim();
  const targetAxle = Number(formData.get("targetAxle"));
  const targetSide = String(formData.get("targetSide") ?? "");
  const dualRaw = String(formData.get("targetDual") ?? "");
  const targetDual = dualRaw === "I" || dualRaw === "E" ? dualRaw : null;
  const vehicleKm = num(formData.get("vehicleKm"));

  if (!installationId) return { error: "Selecione o pneu de origem." };
  if (!targetVehicleId || !Number.isInteger(targetAxle) || !["E", "D"].includes(targetSide))
    return { error: "Selecione a posição de destino." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("move_tire", {
    p_installation_id: installationId,
    p_target_vehicle: targetVehicleId,
    p_target_axle: targetAxle,
    p_target_side: targetSide,
    ...(targetDual ? { p_target_dual: targetDual } : {}),
    ...(vehicleKm != null ? { p_km: Math.round(vehicleKm) } : {}),
  });
  if (error) return { error: `Não foi possível mover: ${error.message}` };

  await logAudit({
    action: "update",
    entity: "tire",
    entityId: installationId,
    detail: { rodizio: true, position: `${targetAxle}${targetSide}${targetDual ?? ""}` },
  });
  revalidateTires(targetVehicleId);
  return { ok: true };
}

/** Volta do conserto: registra o evento (custo/oficina) e devolve ao estoque. */
export async function repairReturn(
  _prev: TireFormState,
  formData: FormData,
): Promise<TireFormState> {
  const tireId = String(formData.get("tireId") ?? "").trim();
  const cost = num(formData.get("cost"));
  const vendor = String(formData.get("vendor") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;
  if (!tireId) return { error: "Pneu inválido." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada. Entre novamente." };

  const { data: tire, error } = await supabase
    .from("tires")
    .update({ status: "estoque" })
    .eq("id", tireId)
    .select("fire_number")
    .single();
  if (error || !tire) return { error: "Pneu não encontrado." };

  await supabase.from("tire_events").insert({
    tire_id: tireId,
    event_type: "conserto",
    cost,
    vendor,
    notes,
    created_by: user.id,
  });

  await logAudit({
    action: "update",
    entity: "tire",
    entityId: tire.fire_number,
    detail: { fogo: tire.fire_number, conserto: true },
  });
  revalidateTires();
  return { ok: true };
}

/** Registra aferição de sulco (e pressão). Sem auditoria — é rotina, não ação sensível. */
export async function recordReading(
  _prev: TireFormState,
  formData: FormData,
): Promise<TireFormState> {
  const tireId = String(formData.get("tireId") ?? "").trim();
  const treadMm = num(formData.get("treadMm"));
  const pressurePsi = num(formData.get("pressurePsi"));
  const vehicleKm = num(formData.get("vehicleKm"));

  if (!tireId) return { error: "Pneu inválido." };
  if (treadMm == null || treadMm < 0 || treadMm > 30)
    return { error: "Sulco inválido (use mm, ex.: 4,5)." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada. Entre novamente." };

  const { error } = await supabase.from("tire_readings").insert({
    tire_id: tireId,
    tread_mm: treadMm,
    pressure_psi: pressurePsi != null ? Math.round(pressurePsi) : null,
    vehicle_km: vehicleKm != null ? Math.round(vehicleKm) : null,
    created_by: user.id,
  });
  if (error) return { error: `Não foi possível registrar: ${error.message}` };

  revalidateTires();
  return { ok: true };
}

/** Volta da recapadora: nova vida (incrementa), novo sulco, status estoque. */
export async function recapReturn(
  _prev: TireFormState,
  formData: FormData,
): Promise<TireFormState> {
  const tireId = String(formData.get("tireId") ?? "").trim();
  const newTread = num(formData.get("newTreadMm"));
  const cost = num(formData.get("cost"));
  const vendor = String(formData.get("vendor") ?? "").trim() || null;
  if (!tireId) return { error: "Pneu inválido." };
  if (newTread == null || newTread <= 0) return { error: "Informe o sulco da recapagem (mm)." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada. Entre novamente." };

  const { data: tire, error: tErr } = await supabase
    .from("tires")
    .select("fire_number, current_life")
    .eq("id", tireId)
    .single();
  if (tErr || !tire) return { error: "Pneu não encontrado." };

  const { error } = await supabase
    .from("tires")
    .update({ status: "estoque", current_life: tire.current_life + 1, tread_new_mm: newTread })
    .eq("id", tireId);
  if (error) return { error: `Não foi possível registrar: ${error.message}` };

  await supabase.from("tire_events").insert({
    tire_id: tireId,
    event_type: "recapagem",
    cost,
    vendor,
    new_tread_mm: newTread,
    created_by: user.id,
  });

  await logAudit({
    action: "update",
    entity: "tire",
    entityId: tire.fire_number,
    detail: { fogo: tire.fire_number, recapagem: true, vida: tire.current_life + 1 },
  });
  revalidateTires();
  return { ok: true };
}
