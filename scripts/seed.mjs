// Seed do CRIS — cria admin, motoristas, veículos e atribuições reais da TOP DIESEL.
// Rodar: node --env-file=.env.local scripts/seed.mjs
// Usa a service role (server) p/ criar usuários de auth + inserir dados. Idempotente.
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Faltam NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY no .env.local");
  process.exit(1);
}
const db = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

const DOMAIN = "auth.topdiesel.local";
const DEFAULT_PASSWORD = "mudar123"; // troca forçada no 1º acesso

// --- Pessoas (CPFs são placeholders; Gabriel corrige na UI) ---
const ADMIN = { cpf: "00000000000", full_name: "Gabriel Krull", role: "admin" };
const DRIVERS = [
  { cpf: "00000000101", full_name: "Daurio Afonso Fritzen" },
  { cpf: "00000000102", full_name: "Dionatan Lusani Brugger" },
  { cpf: "00000000103", full_name: "Dionei Antonio da Costa" },
  { cpf: "00000000104", full_name: "Gabriel da Silva" },
  { cpf: "00000000105", full_name: "Helio Levandoski" },
  { cpf: "00000000106", full_name: "Jucemar Borga" },
  { cpf: "00000000107", full_name: "Maicon Hultmann" },
  { cpf: "00000000108", full_name: "Mauricio da Silva" },
  { cpf: "00000000109", full_name: "Odacir Debetio" },
];

// --- Veículos reais (planilha troca de óleo + pastas). type/empresa provisórios ---
const VEHICLES = [
  { plate: "AUH-6B05", model: "Ford Cargo 1317", year: 2011, vehicle_type: "truck" },
  { plate: "HTP-2H05", model: "Ford Cargo 1722", year: null, vehicle_type: "truck" },
  { plate: "MJE-8F98", model: "Mercedes-Benz 1718", year: null, vehicle_type: "truck" },
  { plate: "PRP-3F41", model: "Mercedes-Benz Atego 3030", year: 2018, vehicle_type: "truck" },
  { plate: "SXJ-8I34", model: "Mercedes-Benz Atego 3033", year: 2024, vehicle_type: "truck" },
  { plate: "SXJ-8C24", model: "Mercedes-Benz", year: null, vehicle_type: "truck" },
  { plate: "JAQ-3B19", model: "VW Constellation 24.280", year: 2020, vehicle_type: "truck" },
  { plate: "EVK-1792", model: "VW 8.150 Delivery", year: 2010, vehicle_type: "truck" },
  { plate: "RAA-9I02", model: "Iveco Stralis 600S", year: 2022, vehicle_type: "cavalo" },
  { plate: "SXH-2B72", model: "Iveco S-Way 480", year: 2024, vehicle_type: "cavalo" },
  { plate: "SXL-9E56", model: "Mercedes-Benz Actros 2553", year: null, vehicle_type: "cavalo" },
  { plate: "MMJ-7325", model: "Semirreboque", year: null, vehicle_type: "semi_reboque" },
  { plate: "BEB-4D79", model: "VW Gol", year: null, vehicle_type: "leve" },
  { plate: "QIK-1J12", model: "Fiat Strada", year: 2017, vehicle_type: "leve" },
  { plate: "MYW-6B15", model: null, year: null, vehicle_type: "leve" },
];

// --- Atribuições (placa → cpf do motorista), só as conhecidas da planilha ---
const ASSIGNMENTS = [
  { plate: "AUH-6B05", cpf: "00000000102" }, // Dionatan
  { plate: "HTP-2H05", cpf: "00000000109" }, // Odacir
  { plate: "MJE-8F98", cpf: "00000000101" }, // Daurio
  { plate: "PRP-3F41", cpf: "00000000103" }, // Dionei
  { plate: "RAA-9I02", cpf: "00000000107" }, // Maicon
  { plate: "SXH-2B72", cpf: "00000000106" }, // Jucemar
];

async function ensureUser({ cpf, full_name, role = "driver" }) {
  const email = `${cpf}@${DOMAIN}`;
  // Procura existente
  const { data: list } = await db.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const existing = list?.users?.find((u) => u.email === email);
  let id;
  if (existing) {
    id = existing.id;
  } else {
    const { data, error } = await db.auth.admin.createUser({
      email,
      password: DEFAULT_PASSWORD,
      email_confirm: true,
    });
    if (error) throw new Error(`createUser ${cpf}: ${error.message}`);
    id = data.user.id;
  }
  const { error: pErr } = await db
    .from("profiles")
    .upsert({ id, cpf, full_name, role }, { onConflict: "id" });
  if (pErr) throw new Error(`profile ${cpf}: ${pErr.message}`);
  return id;
}

async function main() {
  console.log("Limpando dados de negócio…");
  await db.from("vehicle_assignments").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await db.from("vehicles").delete().neq("id", "00000000-0000-0000-0000-000000000000");

  console.log("Criando admin e motoristas…");
  const adminId = await ensureUser(ADMIN);
  const driverIds = {};
  for (const d of DRIVERS) driverIds[d.cpf] = await ensureUser({ ...d, role: "driver" });

  console.log("Inserindo veículos…");
  const { data: company } = await db
    .from("companies")
    .select("id")
    .eq("kind", "top_diesel")
    .single();
  const vehRows = VEHICLES.map((v) => ({ ...v, company_id: company.id, created_by: adminId }));
  const { data: insertedVeh, error: vErr } = await db.from("vehicles").insert(vehRows).select("id, plate");
  if (vErr) throw new Error(`vehicles: ${vErr.message}`);
  const byPlate = Object.fromEntries(insertedVeh.map((v) => [v.plate, v.id]));

  console.log("Inserindo atribuições…");
  const assignRows = ASSIGNMENTS.map((a) => ({
    vehicle_id: byPlate[a.plate],
    driver_id: driverIds[a.cpf],
    created_by: adminId,
  }));
  const { error: aErr } = await db.from("vehicle_assignments").insert(assignRows);
  if (aErr) throw new Error(`assignments: ${aErr.message}`);

  console.log(
    `OK: ${VEHICLES.length} veículos, ${DRIVERS.length} motoristas, ${ASSIGNMENTS.length} atribuições, 1 admin (CPF ${ADMIN.cpf}, senha ${DEFAULT_PASSWORD}).`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
