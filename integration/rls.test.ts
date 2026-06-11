import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Teste de integração da RLS por cargo (motorista) contra o Supabase local.
 * Garante o conceito central do CRIS: o motorista só enxerga o que é dele —
 * o veículo atribuído, os próprios documentos e o próprio perfil. Nada alheio.
 *
 * Exige Docker + Supabase up (pnpm exec supabase start) e dados do seed.
 * Roda com `pnpm test:rls`.
 */

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const DOMAIN = "auth.topdiesel.local";
const PASSWORD = "mudar123";

const CPF_A = "00000000101"; // Daurio
const CPF_B = "00000000102"; // Dionatan
const CPF_CAVALO = "00000000107"; // Maicon — atribuído a um cavalo (RAA-9I02)

const noPersist = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = createClient(URL, SERVICE, noPersist);

async function profileIdByCpf(cpf: string): Promise<string> {
  const { data, error } = await admin.from("profiles").select("id").eq("cpf", cpf).single();
  if (error) throw new Error(`perfil ${cpf}: ${error.message}`);
  return data.id;
}

async function activeVehicle(driverId: string): Promise<string> {
  const { data, error } = await admin
    .from("vehicle_assignments")
    .select("vehicle_id")
    .eq("driver_id", driverId)
    .is("unassigned_at", null)
    .single();
  if (error) throw new Error(`atribuição de ${driverId}: ${error.message}`);
  return data.vehicle_id;
}

/** Loga como motorista e devolve um cliente autenticado (sessão própria). */
async function signInDriver(cpf: string): Promise<SupabaseClient> {
  const client = createClient(URL, ANON, noPersist);
  const { error } = await client.auth.signInWithPassword({
    email: `${cpf}@${DOMAIN}`,
    password: PASSWORD,
  });
  if (error) throw new Error(`login ${cpf}: ${error.message}`);
  return client;
}

let driverA = "";
let driverB = "";
let vehicleA = "";
let vehicleB = "";
let createdVehicleDocB: string | null = null; // só o que ESTE teste inseriu
let createdDriverDocB: string | null = null;
let asDriverA: SupabaseClient;

const ready = !!URL && !!ANON && !!SERVICE;

describe.skipIf(!ready)("RLS — isolamento do motorista", () => {
  beforeAll(async () => {
    driverA = await profileIdByCpf(CPF_A);
    driverB = await profileIdByCpf(CPF_B);
    vehicleA = await activeVehicle(driverA);
    vehicleB = await activeVehicle(driverB);
    expect(vehicleA).not.toBe(vehicleB);

    // Garante que existe um documento alheio (do veículo e do motorista B) para
    // o teste de isolamento não ser vazio. Cria via service role se faltar.
    const { data: vdoc } = await admin
      .from("vehicle_documents")
      .select("id")
      .eq("vehicle_id", vehicleB)
      .is("deleted_at", null)
      .limit(1)
      .maybeSingle();
    if (!vdoc) {
      const { data } = await admin
        .from("vehicle_documents")
        .insert({ vehicle_id: vehicleB, doc_type: "crlv" })
        .select("id")
        .single();
      createdVehicleDocB = data?.id ?? null;
    }

    const { data: ddoc } = await admin
      .from("driver_documents")
      .select("id")
      .eq("driver_id", driverB)
      .is("deleted_at", null)
      .limit(1)
      .maybeSingle();
    if (!ddoc) {
      const { data } = await admin
        .from("driver_documents")
        .insert({ driver_id: driverB, doc_type: "cnh" })
        .select("id")
        .single();
      createdDriverDocB = data?.id ?? null;
    }

    asDriverA = await signInDriver(CPF_A);
  });

  afterAll(async () => {
    // Remove só o que este teste inseriu (não toca em dados do seed).
    if (createdVehicleDocB)
      await admin.from("vehicle_documents").delete().eq("id", createdVehicleDocB);
    if (createdDriverDocB)
      await admin.from("driver_documents").delete().eq("id", createdDriverDocB);
    await asDriverA?.auth.signOut();
  });

  it("o service role enxerga a frota inteira (controle: a base não está vazia)", async () => {
    const { data } = await admin.from("vehicles").select("id");
    expect((data ?? []).length).toBeGreaterThan(1);
  });

  it("motorista lê apenas o próprio veículo atribuído", async () => {
    const { data, error } = await asDriverA.from("vehicles").select("id");
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data![0].id).toBe(vehicleA);
  });

  it("motorista NÃO lê um veículo alheio pelo id", async () => {
    const { data } = await asDriverA.from("vehicles").select("id").eq("id", vehicleB);
    expect(data ?? []).toHaveLength(0);
  });

  it("motorista NÃO lê documentos de veículo alheio", async () => {
    const { data } = await asDriverA
      .from("vehicle_documents")
      .select("id, vehicle_id")
      .eq("vehicle_id", vehicleB);
    expect(data ?? []).toHaveLength(0);
  });

  it("todo documento de veículo visível pertence ao veículo do motorista", async () => {
    const { data } = await asDriverA.from("vehicle_documents").select("vehicle_id");
    for (const row of data ?? []) expect(row.vehicle_id).toBe(vehicleA);
  });

  it("motorista lê apenas o próprio perfil", async () => {
    const { data } = await asDriverA.from("profiles").select("id");
    expect(data).toHaveLength(1);
    expect(data![0].id).toBe(driverA);
  });

  it("motorista NÃO lê documentos de outro motorista", async () => {
    const { data } = await asDriverA
      .from("driver_documents")
      .select("id, driver_id")
      .eq("driver_id", driverB);
    expect(data ?? []).toHaveLength(0);
  });

  it("todo documento de motorista visível é do próprio motorista", async () => {
    const { data } = await asDriverA.from("driver_documents").select("driver_id");
    for (const row of data ?? []) expect(row.driver_id).toBe(driverA);
  });

  it("motorista NÃO lê a auditoria (só staff)", async () => {
    const { data } = await asDriverA.from("audit_logs").select("id");
    expect(data ?? []).toHaveLength(0);
  });

  it("motorista PODE ler empresas (etiqueta do veículo)", async () => {
    const { data, error } = await asDriverA.from("companies").select("id");
    expect(error).toBeNull();
    expect((data ?? []).length).toBeGreaterThanOrEqual(1);
  });
});

describe.skipIf(!ready)("RLS — engate (vehicle_couplings)", () => {
  let createdCouplingId: string | null = null;
  let tractorId = "";
  let asMaicon: SupabaseClient;

  beforeAll(async () => {
    const maiconId = await profileIdByCpf(CPF_CAVALO);
    tractorId = await activeVehicle(maiconId); // RAA-9I02 (cavalo)

    // Garante um engate ativo no cavalo do Maicon (cria se faltar).
    const { data: active } = await admin
      .from("vehicle_couplings")
      .select("id")
      .eq("tractor_id", tractorId)
      .is("uncoupled_at", null)
      .maybeSingle();
    if (!active) {
      const { data: trailer } = await admin
        .from("vehicles")
        .select("id")
        .in("vehicle_type", ["semi_reboque", "reboque"])
        .limit(1)
        .single();
      const { data: created, error } = await admin
        .from("vehicle_couplings")
        .insert({ tractor_id: tractorId, trailer_id: trailer!.id })
        .select("id")
        .single();
      if (error) throw new Error(`engate de teste: ${error.message}`);
      createdCouplingId = created!.id;
    }

    asMaicon = await signInDriver(CPF_CAVALO);
  });

  afterAll(async () => {
    if (createdCouplingId)
      await admin.from("vehicle_couplings").delete().eq("id", createdCouplingId);
    await asMaicon?.auth.signOut();
  });

  it("motorista do cavalo LÊ o engate do próprio veículo", async () => {
    const { data, error } = await asMaicon.from("vehicle_couplings").select("tractor_id");
    expect(error).toBeNull();
    expect((data ?? []).length).toBeGreaterThanOrEqual(1);
    for (const row of data ?? []) expect(row.tractor_id).toBe(tractorId);
  });

  it("outro motorista NÃO lê engate alheio", async () => {
    const other = await signInDriver(CPF_A); // Daurio — veículo é truck, sem engate
    const { data } = await other.from("vehicle_couplings").select("id");
    expect(data ?? []).toHaveLength(0);
    await other.auth.signOut();
  });
});
