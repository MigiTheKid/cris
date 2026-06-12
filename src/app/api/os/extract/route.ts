import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { osExtraidaSchema, type OsExtraida } from "@/lib/schemas/os-extraida";

export const maxDuration = 60;

const MEDIA_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
type MediaType = (typeof MEDIA_TYPES)[number];
const PDF_TYPE = "application/pdf";

const MODEL_FAST = "claude-haiku-4-5";
const MODEL_SMART = "claude-sonnet-4-6";

function norm(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

function normPlate(s: string | null): string {
  return (s ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function buildPrompt(ctx: {
  plate: string;
  systems: string[];
  catalog: { name: string; system: string }[];
  vendors: string[];
}): string {
  const catalogLines = ctx.catalog.map((c) => `- ${c.name} [${c.system}]`).join("\n");
  return `Você extrai dados de ordens de serviço / notas de oficina de manutenção de caminhões de uma transportadora brasileira (TRR).

Analise a imagem e extraia os dados conforme o schema. Responda APENAS com JSON válido, sem markdown, sem texto antes ou depois.

REGRAS:
- Se um campo não estiver legível ou não existir, use null. NUNCA invente valores.
- "oficina_nome": a razão social / nome fantasia do EMITENTE do documento (a oficina ou fornecedor que emitiu a nota) — em DANFEs fica no quadro do emitente, no topo.
- Valores monetários: número decimal com ponto (ex.: 1250.50), sem "R$" e sem separador de milhar.
- Datas: "YYYY-MM-DD". Quilometragem: número inteiro.
- Placa: letras maiúsculas sem hífen. O veículo esperado é ${ctx.plate} — se a placa na foto for diferente, extraia a da foto mesmo assim.
- Em "itens", liste TODAS as linhas discriminadas (peças e serviços/mão de obra). tipo_item: "peca" para peças/materiais, "servico" para mão de obra e serviços. Mão de obra não discriminada vira um item "servico" com descricao "Mão de obra".
- "unidade": un, jg (jogo), par, L, kg ou h — null se não der pra saber.
- "servico_catalogo": para cada item, se ele corresponder a um serviço do CATÁLOGO abaixo, copie o nome EXATO do catálogo; senão null. Ex.: "TROCA LONA DIANT" → "Troca de lonas de freio".
- "sistema": classifique cada item em um dos SISTEMAS abaixo (nome exato). Para peças, o sistema da peça (ex.: lona → Freios). Use "Geral / Lubrificação" quando não souber.
- "confianca_geral": 0 a 1, sua avaliação honesta da legibilidade (abaixo de 0.7 = foto ruim/manuscrito difícil).

SISTEMAS (use o nome exato):
${ctx.systems.join(" | ")}

CATÁLOGO DE SERVIÇOS (nome exato [sistema]):
${catalogLines}

OFICINAS CONHECIDAS (se o emitente parecer uma destas, use o nome exato; senão o nome que estiver na nota):
${ctx.vendors.join(" | ") || "(nenhuma cadastrada)"}

SCHEMA JSON:
{
  "oficina_nome": string | null,
  "numero_os": string | null,
  "data_emissao": string | null,
  "placa": string | null,
  "km": number | null,
  "itens": [{
    "tipo_item": "peca" | "servico",
    "descricao": string,
    "quantidade": number | null,
    "unidade": "un" | "jg" | "par" | "L" | "kg" | "h" | null,
    "valor_total": number | null,
    "servico_catalogo": string | null,
    "sistema": string | null
  }],
  "valor_total": number | null,
  "observacoes": string | null,
  "confianca_geral": number
}`;
}

export async function POST(req: NextRequest) {
  // --- Autenticação: somente equipe (admin/manager) lança OS ---
  const profile = await getCurrentProfile();
  if (!profile || (profile.role !== "admin" && profile.role !== "manager")) {
    return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "IA não configurada: falta a ANTHROPIC_API_KEY no servidor." },
      { status: 500 },
    );
  }

  const formData = await req.formData();
  const file = formData.get("foto");
  const vehicleId = String(formData.get("vehicleId") ?? "").trim();
  const advanced = formData.get("advanced") === "1";
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Nenhuma foto enviada." }, { status: 400 });
  }
  if (!vehicleId) {
    return NextResponse.json({ error: "Veículo inválido." }, { status: 400 });
  }
  const isPdf = file.type === PDF_TYPE;
  if (!isPdf && !MEDIA_TYPES.includes(file.type as MediaType)) {
    return NextResponse.json(
      { error: "Formato não suportado — use foto (JPG/PNG/WebP) ou PDF." },
      { status: 415 },
    );
  }

  const supabase = await createClient();

  // --- 1. Upload da foto original (auditoria) ---
  const ext = isPdf
    ? "pdf"
    : file.type === "image/png"
      ? "png"
      : file.type === "image/webp"
        ? "webp"
        : "jpg";
  const storagePath = `${vehicleId}/${Date.now()}.${ext}`;
  const { error: uploadError } = await supabase.storage
    .from("os-photos")
    .upload(storagePath, file, { contentType: file.type });
  if (uploadError) {
    return NextResponse.json(
      { error: `Falha ao guardar a foto: ${uploadError.message}` },
      { status: 500 },
    );
  }

  // --- 2. Contexto da frota: placa, catálogo, oficinas, histórico ---
  const [
    vehicleRes,
    systemsRes,
    servicesRes,
    vendorsRes,
    woRes,
    oilRes,
    tiresRes,
    costsRes,
    oilItemsRes,
  ] = await Promise.all([
    supabase.from("vehicles").select("plate").eq("id", vehicleId).single(),
    supabase.from("maintenance_systems").select("id, name").eq("is_active", true).order("sort"),
    supabase
      .from("service_catalog")
      .select("id, name, system_id, default_interval_km")
      .eq("is_active", true),
    supabase.from("vendors").select("id, name, kind").eq("is_active", true),
    supabase.from("work_orders").select("odometer_km").eq("vehicle_id", vehicleId),
    supabase.from("oil_changes").select("odometer_km").eq("vehicle_id", vehicleId),
    supabase
      .from("tire_installations")
      .select("installed_km, removed_km")
      .eq("vehicle_id", vehicleId),
    supabase.from("work_order_costs").select("label, quantity, cost"),
    supabase.from("oil_change_items").select("label, quantity, cost"),
  ]);

  if (!vehicleRes.data) {
    return NextResponse.json({ error: "Veículo não encontrado." }, { status: 404 });
  }
  const systems = systemsRes.data ?? [];
  const services = servicesRes.data ?? [];
  const vendors = vendorsRes.data ?? [];
  const systemNameById = new Map(systems.map((s) => [s.id, s.name]));

  const prompt = buildPrompt({
    plate: vehicleRes.data.plate,
    systems: systems.map((s) => s.name),
    catalog: services.map((s) => ({
      name: s.name,
      system: systemNameById.get(s.system_id) ?? "—",
    })),
    vendors: vendors.map((v) => v.name),
  });

  // --- 3. Claude lê a foto ---
  const anthropic = new Anthropic();
  const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");
  let raw = "";
  try {
    const message = await anthropic.messages.create({
      model: advanced ? MODEL_SMART : MODEL_FAST,
      max_tokens: 4000,
      messages: [
        {
          role: "user",
          content: [
            isPdf
              ? {
                  type: "document" as const,
                  source: { type: "base64" as const, media_type: PDF_TYPE, data: base64 },
                }
              : {
                  type: "image" as const,
                  source: {
                    type: "base64" as const,
                    media_type: file.type as MediaType,
                    data: base64,
                  },
                },
            { type: "text", text: prompt },
          ],
        },
      ],
    });
    raw = message.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("")
      .replace(/```json|```/g, "")
      .trim();
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) {
      return NextResponse.json(
        { error: "Chave da API inválida — confira a ANTHROPIC_API_KEY." },
        { status: 500 },
      );
    }
    const msg = err instanceof Anthropic.APIError ? err.message : "erro inesperado";
    return NextResponse.json({ error: `Falha na leitura por IA: ${msg}` }, { status: 502 });
  }

  let extracted: OsExtraida;
  try {
    extracted = osExtraidaSchema.parse(JSON.parse(raw));
  } catch {
    return NextResponse.json(
      {
        error: "Não consegui estruturar os dados da foto. Tente uma foto mais nítida e reta.",
        storagePath,
      },
      { status: 422 },
    );
  }

  // --- 4. Cruzamento com a frota (os superpoderes) ---
  const warnings: string[] = [];

  // Placa bate com o veículo?
  const expectedPlate = normPlate(vehicleRes.data.plate);
  const photoPlate = normPlate(extracted.placa);
  if (photoPlate && expectedPlate && photoPlate !== expectedPlate) {
    warnings.push(
      `A placa na foto (${extracted.placa}) é diferente da placa deste veículo (${vehicleRes.data.plate}). Confira se está lançando no veículo certo.`,
    );
  }

  // Km faz sentido com o histórico?
  const kmKnown = [
    ...(woRes.data ?? []).map((r) => r.odometer_km),
    ...(oilRes.data ?? []).map((r) => r.odometer_km),
    ...(tiresRes.data ?? []).flatMap((r) => [r.installed_km, r.removed_km]),
  ].filter((n): n is number => typeof n === "number");
  const maxKm = kmKnown.length ? Math.max(...kmKnown) : null;
  if (extracted.km != null && maxKm != null && extracted.km < maxKm) {
    warnings.push(
      `O km na foto (${extracted.km.toLocaleString("pt-BR")}) é menor que o último km conhecido do veículo (${maxKm.toLocaleString("pt-BR")}). Confira o odômetro.`,
    );
  }

  // Oficina conhecida?
  let vendorId: string | null = null;
  if (extracted.oficina_nome) {
    const target = norm(extracted.oficina_nome);
    const hit = vendors.find(
      (v) =>
        norm(v.name) === target || norm(v.name).includes(target) || target.includes(norm(v.name)),
    );
    if (hit) vendorId = hit.id;
    else
      warnings.push(
        `Oficina "${extracted.oficina_nome}" não está no catálogo — cadastre-a ou escolha uma existente.`,
      );
  }

  // Soma dos itens bate com o total da nota?
  const somaItens = extracted.itens.reduce((s, i) => s + (i.valor_total ?? 0), 0);
  if (extracted.valor_total != null && Math.abs(somaItens - extracted.valor_total) > 0.05) {
    warnings.push(
      `A soma dos itens (R$ ${somaItens.toFixed(2)}) não bate com o total da nota (R$ ${extracted.valor_total.toFixed(2)}). Confira os valores.`,
    );
  }

  // Preço vs histórico (peças e insumos já lançados, por nome).
  const history = new Map<string, { total: number; count: number }>();
  for (const r of [...(costsRes.data ?? []), ...(oilItemsRes.data ?? [])]) {
    const qty = r.quantity != null ? Number(r.quantity) : null;
    const unit = qty && qty > 0 ? Number(r.cost) / qty : Number(r.cost);
    const k = norm(r.label);
    const cur = history.get(k) ?? { total: 0, count: 0 };
    cur.total += unit;
    cur.count += 1;
    history.set(k, cur);
  }
  for (const item of extracted.itens) {
    if (item.valor_total == null) continue;
    const qty = item.quantidade && item.quantidade > 0 ? item.quantidade : 1;
    const unitPrice = item.valor_total / qty;
    const h = history.get(norm(item.descricao));
    if (h && h.count >= 2) {
      const avg = h.total / h.count;
      if (unitPrice > avg * 1.3) {
        warnings.push(
          `"${item.descricao}" a R$ ${unitPrice.toFixed(2)}/un está ${Math.round(((unitPrice - avg) / avg) * 100)}% acima da sua média histórica (R$ ${avg.toFixed(2)}).`,
        );
      }
    }
  }

  // --- 5. Monta o pré-preenchimento no formato do WorkOrderDialog ---
  const serviceByName = new Map(services.map((s) => [norm(s.name), s]));
  const systemByName = new Map(systems.map((s) => [norm(s.name), s.id]));
  const fallbackSystemId =
    systems.find((s) => s.name.startsWith("Geral"))?.id ?? systems[0]?.id ?? 18;

  // Agrupa: cada item "servico" vira um item de OS; peças penduram no serviço
  // do mesmo sistema (ou num item "Serviços diversos" do sistema da peça).
  type PrefillItem = {
    id: string;
    serviceId: string | null;
    label: string;
    systemId: number;
    systemName: string;
    description: string | null;
    nextKm: number | null;
    costs: {
      category: "peca" | "mao_de_obra";
      label: string;
      quantity: number | null;
      unit: string | null;
      cost: number;
    }[];
    total: number;
  };
  const items: PrefillItem[] = [];

  const itemFor = (systemId: number, viaService?: (typeof services)[number]): PrefillItem => {
    if (viaService) {
      const found = items.find((i) => i.serviceId === viaService.id);
      if (found) return found;
      const next =
        viaService.default_interval_km != null && extracted.km != null
          ? extracted.km + viaService.default_interval_km
          : null;
      const created: PrefillItem = {
        id: "",
        serviceId: viaService.id,
        label: viaService.name,
        systemId: viaService.system_id,
        systemName: systemNameById.get(viaService.system_id) ?? "—",
        description: null,
        nextKm: next,
        costs: [],
        total: 0,
      };
      items.push(created);
      return created;
    }
    const found = items.find((i) => i.serviceId === null && i.systemId === systemId);
    if (found) return found;
    const created: PrefillItem = {
      id: "",
      serviceId: null,
      label: `Serviços — ${systemNameById.get(systemId) ?? "geral"}`,
      systemId,
      systemName: systemNameById.get(systemId) ?? "—",
      description: null,
      nextKm: null,
      costs: [],
      total: 0,
    };
    items.push(created);
    return created;
  };

  for (const raw of extracted.itens) {
    const systemId = raw.sistema
      ? (systemByName.get(norm(raw.sistema)) ?? fallbackSystemId)
      : fallbackSystemId;
    const matched = raw.servico_catalogo
      ? serviceByName.get(norm(raw.servico_catalogo))
      : undefined;
    const target = itemFor(systemId, matched);
    target.costs.push({
      category: raw.tipo_item === "servico" ? "mao_de_obra" : "peca",
      label: raw.descricao,
      quantity: raw.quantidade,
      unit: raw.unidade,
      cost: raw.valor_total ?? 0,
    });
  }
  for (const i of items) i.total = i.costs.reduce((s, c) => s + c.cost, 0);

  if (extracted.confianca_geral < 0.7) {
    warnings.unshift(
      "A foto está difícil de ler — confira todos os campos com atenção ou tente a leitura avançada.",
    );
  }

  return NextResponse.json({
    order: {
      id: "",
      performedAt: extracted.data_emissao,
      odometerKm: extracted.km ?? 0,
      reason: "corretiva",
      vendorId,
      vendorName: null,
      osRef: extracted.numero_os,
      notes: extracted.observacoes,
      items,
      total: items.reduce((s, i) => s + i.total, 0),
    },
    warnings,
    confidence: extracted.confianca_geral,
    storagePath,
    model: advanced ? MODEL_SMART : MODEL_FAST,
  });
}
