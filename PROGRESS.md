# PROGRESS — CRIS

Estado do projeto para retomar a qualquer momento.

## Como rodar

- Banco: Docker Desktop aberto → `pnpm exec supabase start` (já inicializado).
- App: `pnpm dev` → **http://localhost:3210** (porta fixa; a 3000 é de outro projeto).
- Supabase Studio: http://localhost:54323
- Re-semear dados de exemplo: `node --env-file=.env.local scripts/seed.mjs`
- Login (auth REAL funcionando):
  - Admin: CPF `000.000.000-00` / senha `mudar123` (Gabriel Krull) → /painel
  - Motorista: CPF `000.000.001-01` / senha `mudar123` (Daurio) → /motorista

## ✅ M2 PNEUS — Fase 2: rodízio + recapagem + linha da vida (11/06)

- **Rodízio em 1 passo**: function SQL `move_tire` (atômica — nunca deixa pneu
  no limbo): move pra posição livre OU **troca** os dois pneus se ocupada, nos
  dois sentidos do conjunto (cavalo ⇄ reboque). `RodizioDialog` no painel do
  rodado lista todas as posições ("Posição livre" / "Trocar com o fogo X") + km.
- **Recapagem/conserto com custo**: botão **Receber** na página /pneus para
  pneus "Na recapadora"/"Em conserto" → `TireReturnDialog` (sulco da recapagem,
  custo, recapadora/oficina) → recapReturn (vida+1) / repairReturn (estoque).
- **Sucata com motivo**: destino Sucata no RemoveTireDialog abre campo de motivo
  → evento `sucateamento` com notes (causa-raiz pras análises da Fase 3).
- **Linha da vida** `/pneus/[id]`: hero (fogo, vida, status, onde está) + KPIs
  (sulco atual/da vida, **km registrada** somada das instalações, **custo
  acumulado** compra+recapes+consertos, nº aferições) + timeline unificada
  (compra → instalações/remoções com km → aferições → recapagem/conserto/sucata
  com custos). Fogo na tabela /pneus e botão Histórico no rodado linkam pra cá.
- **Verificado e2e no browser** (com os pneus reais do Miguel, restaurados ao
  estado original depois): mover 151 1E→1D; swap 151⇄150 entre RAA e MMJ com km
  292.500 nos dois lados; receber 998 da recapadora (2ª vida, R$ 650); linha da
  vida com km 41.000 e custo R$ 3.130 calculados; sucata com motivo registrada.

## ✅ Pneus: limiares de sulco configuráveis (11/06)

- Migration `20260611130000_app_settings.sql`: tabela `app_settings` (chave/valor
  jsonb) com seed `tire_thresholds {ok_mm:5, recap_mm:3}`. RLS: leitura autenticada,
  escrita só admin (`current_role_name()='admin'`).
- `treadTone(mm, thresholds)` parametrizado; `getTireThresholds()` (fallback no
  padrão); `saveTireThresholds` (admin gate, valida ≥1,6 legal e verde>retirada,
  auditado como entity `settings`).
- Configurações → seção **"Pneus — limiares de sulco"** (admin):
  `TireThresholdsForm` com **prévia ao vivo** da régua de cores ao digitar.
- Tudo dinâmico: diagrama do rodado, legenda da aba Pneus, dica do dialog de
  aferição e KPI "Críticos" da página /pneus leem do parâmetro.
- **Verificado no browser**: prévia ao vivo OK; validação legal bloqueou 1 mm;
  salvei 6/4 → pneu 151 (3,2 mm, do Miguel) virou VERMELHO "Retirar" e legenda
  mostrou ≥6/4–6/<4; banco e auditoria confirmados. Revertido pro padrão 5/3
  (Miguel define o valor real pela UI); pneus 150/151 do Miguel preservados.

## ✅ M2 PNEUS — Fase 1 (11/06) — O DIFERENCIAL

Conceito aprovado pelo Miguel (pedido do Fermino): pesquisa de mercado (Prolog,
Fleetio/RTA, CONTRAN/recapagem) + material interno (planilha nº de fogo 94–174,
ficha JRM com diagrama). Tese: "o pneu é um patrimônio que viaja".

- **Migration `20260611120000_tires.sql`**: tires (nº de fogo único, vida,
  sulco novo, status em_uso/estoque/recapagem/conserto/sucateado/vendido),
  vehicle_axles (layout por veículo: nº, tipo, duplo), tire_installations
  (vínculo temporal pneu×veículo×posição eixo+lado+dual com km; índices únicos
  nos 2 lados — posição "U" via coalesce p/ singles), tire_readings (sulco/
  pressão/km), tire_events (recapagem/conserto/sucata/venda c/ custo). RLS
  staff + motorista lê rodado do próprio veículo.
- **Helpers** `src/lib/tires.ts`: limiares (≥5 ok / 3–5 recape / <3 retirar),
  positionCode/Label (1E, 2DE…), AXLE_PRESETS por tipo (cavalo 6x2, truck,
  toco, bitruck, semirreboque 3 eixos…).
- **Actions**: saveTire, saveAxleLayout (bloqueia se pneu instalado), installTire,
  removeTire (destino), recordReading (sem audit — rotina), recapReturn (vida+1).
- **UI**: item **Pneus** na sidebar; página `/pneus` (KPIs, estoque por medida
  como a planilha, tabela com sulco colorido e onde está); aba **Pneus** no
  veículo: `TireDiagram` (SVG gerado do layout, conjunto cavalo+reboque com
  engate, pneu colorido por sulco, nº de fogo dentro) + painel da posição
  (instalar do estoque / aferir / remover) + `AxleLayoutDialog` com preset.
- **Verificado no browser ponta a ponta**: cadastro → estoque → preset cavalo →
  diagrama 8 posições → instalou fogo 123 na 1E (km 291.618) → aferiu 4,2 mm →
  pneu ficou ÂMBAR "Janela de recape" → /pneus mostra "RAA-9I02 · 1E". Dados de
  teste limpos (layout de eixos do RAA mantido).
- FASE 2 (próx.): rodízio guiado, recapagem com custo na UI, linha da vida.
  FASE 3: CPK por marca, projeções. Gabriel pode importar a planilha (fogo/medida).

## ✅ Composição cavalo ⇄ reboque (11/06)

- **Modelo**: "o motorista é do cavalo, o reboque segue o cavalo" — conjunto é
  DERIVADO de dois vínculos temporais independentes. Migration
  `20260611100000_vehicle_couplings.sql`: tabela espelho da de atribuição
  (tractor_id/trailer_id/coupled_at/uncoupled_at), índices únicos (1 reboque
  ativo/cavalo e vice-versa), **trigger valida tipos no banco** (só `cavalo`
  engata; só `semi_reboque`/`reboque` é engatado — decisão Miguel: restrito),
  RLS (staff tudo; motorista lê engate do próprio veículo).
- `saveCoupling` (encerra os dois lados, abre o novo, audita couple/uncouple);
  `CouplingDialog` (livre / neste cavalo / "em X — será movido" / Sem reboque);
  `CompositionStrip` (o "trem": cavalo ⫘ reboque com status de cada placa +
  "Fulano conduz o conjunto").
- Aba **Composição** no detalhe (cavalo: gerencia + histórico de engates;
  reboque: leitura invertida com cavalo+condutor); chips ⫘ na lista da Frota
  (dois sentidos); "Conjunto atual: CAVALO ⫘ REBOQUE" no detalhe do motorista.
- Consertado: pior status do veículo agora preserva "Vencido" vs "Crítico"
  (worstExpiryStatus em vez de colapsar por tom).
- **RLS testada**: +2 testes (12/12) — motorista do cavalo lê o próprio engate;
  outro motorista não lê engate alheio.
- **Verificado no browser ponta a ponta**; engate de teste desfeito (Gabriel
  engata o real pela UI). Preparado pros PNEUS (M2): pneu pertence à placa,
  diagrama desenha o conjunto, km do reboque infere-se pelo histórico de engate.

## ✅ M1 finalizada — editar motorista + fotos (10/06)

- **Editar dados do motorista**: `saveDriverProfile` + `DriverProfileDialog`
  (nome/telefone em profiles; CNH/nascimento/admissão em driver_profiles via upsert).
  Botão "Editar dados" no hero; telefone na aba Identificação. Corrigido bug de fuso
  no `fmt()` (formata "YYYY-MM-DD" sem passar por Date).
- **Fotos de veículo e motorista**: migration `20260610210000_storage_photos.sql`
  (bucket privado `photos`, jpeg/png/webp até 5 MB, staff). `uploadVehiclePhoto`/
  `uploadDriverPhoto` (validam, sobem, trocam, removem antiga, auditam); `PhotoUpload`
  (botão "Trocar foto" → seletor → upload → refresh); `signedPhotoUrl` exibe via URL
  assinada no hero (substitui placeholder/avatar). Colunas photo_path já existiam.
- **Verificado no browser**: editei dados do Daurio (datas corretas após o fix),
  subi foto de veículo e de motorista (aparece no hero, photo_path setado, auditado),
  artefatos de teste limpos.

## ✅ Docker resolvido + Upload de PDF VERIFICADO (10/06)

- Docker voltou (engine 29.5.3 — era atualização pendente). Migration do Storage aplicada.
- **Upload de PDF testado de ponta a ponta via preview**: login admin → detalhe do
  AUH-6B05 → dialog → CIPP (validade 24/06/2026) com PDF anexado → salvou, dialog
  fechou, botão 📄 Ver PDF apareceu, arquivo confirmado no Storage (%PDF- íntegro).
- Ficou um **CIPP de teste** no AUH-6B05 (PDF de 199 bytes) — clicar no 📄 pra ver
  abrir; depois substituir pelos dados reais.

## ✅ Motoristas COMPLETO + verificado (10/06)

- Migration `20260610200000_driver_document_types.sql`: tipos do motorista no
  catálogo (CNH, MOPP, Toxicológico, ASO, Outro — scope='driver') + `driver_documents`
  convertida pra usar o catálogo (enum→text + FK), view v_expiry_alerts recriada.
- `DocumentDialog` **generalizado** (`action` + `ownerField`/`ownerId`) → serve
  veículo **e** motorista (DRY). VehicleDetailView atualizado pra passar a action.
- `saveDriverDocument` + rota `/api/driver-documents/[id]/pdf` (URL assinada).
- `getDriverList`/`getDriverDetail` (`src/lib/data/drivers.ts`, CPF mascarado,
  veículo atual via assignment, status documental pelo pior vencimento).
- Páginas reais: `/motoristas` (tabela 9 condutores) + `/motoristas/[id]` (hero,
  abas Documentos/Identificação, grid de docs, add/renovar).
- **Verificado no browser**: lista OK (CPF/veículo/status), detalhe OK, dialog com
  catálogo certo (CNH…Outro), salvou CNH → card "277d" + badge "Em dia" + 1/1; doc
  de teste removido depois (soft-delete).

## ✅ Atribuir/trocar motorista COMPLETO + verificado (10/06)

- `saveAssignment` (`src/lib/actions/assignments.ts`): encerra o vínculo ativo do
  veículo E do motorista (respeita os índices únicos: 1 motorista/veículo e
  1 veículo/motorista), abre o novo; driverId vazio = só desatribui.
- `AssignDriverDialog.tsx`: lista os motoristas marcando "livre" / "neste veículo"
  / "em PLACA — será movido"; opção "Sem motorista". Ligado na aba Motorista do
  detalhe (botão Trocar/Atribuir), card do motorista vira link pra ficha.
- Detalhe do veículo passou a buscar `getDriverList()` pra alimentar o dialog.
- **Verificado no browser**: troquei Daurio→Gabriel, histórico encerrou o anterior,
  índice único confirmado no banco (1 ativo/veículo); revertido pro seed depois.

## ✅ Configurações: usuários + empresas + troca de senha (10/06)

- **Usuários (admin-only)**: `getUserList` + `createUser`/`updateUser`/`resetUserPassword`
  (`src/lib/actions/users.ts`, via service role com trava `requireAdmin()` no código +
  anti-lockout: admin não rebaixa/desativa a si mesmo). `UserDialog` (criar/editar,
  CPF é login imutável, cargo, ativo), botão 🔑 redefine senha (`ResetPasswordButton`).
  Novo usuário nasce com `mudar123` + `must_change_password=true`; driver ganha
  driver_profile vazio.
- **Troca de senha forçada**: `changeOwnPassword` + página `/trocar-senha` +
  `ChangePasswordForm`; gate `must_change_password` no layout (app) e no /motorista.
- **Empresas (admin-only)**: `getCompanies` + `saveCompany` + `CompanyDialog`
  (edita razão social/CNPJ/endereço das 2 existentes).
- Seções Usuários/Empresas só aparecem para admin; gerente vê só Tipos de documento.
- Seed: admin nasce com `must_change_password=false` (bootstrap confiável).
- **Verificado no browser ponta a ponta**: criei gerente → conta Auth criada →
  logout/login como ele → caiu em /trocar-senha → troquei senha → painel como Gerente;
  gerente não vê seções admin; edição de empresa refletiu. Artefatos de teste limpos.

## ✅ Auditoria de ações sensíveis (10/06)

- `logAudit()` (`src/lib/audit.ts`): grava em `audit_logs` via **admin client**
  (a tabela só tem policy de leitura para staff, sem INSERT) com o ator = `auth.uid()`.
  **Best-effort**: nunca lança — falha de log não derruba a operação.
- Instrumentadas todas as actions sensíveis: usuários (criar/editar/redefinir senha),
  atribuição (assign/unassign), documentos de veículo (criar/editar/excluir) e de
  motorista (criar/editar), veículos (criar/editar), empresas, tipos de documento
  (criar/editar/alternar) e troca da própria senha.
- `getAuditLog(40)` + seção **Auditoria** (admin-only) em Configurações:
  `AuditTimeline` com ícone+dot por ação, ator, descrição (a partir do `detail`
  gravado: placa/nome/cargo/razão social/tipo) e horário; mais recente no topo.
- **Verificado no browser**: editei empresa e alternei um tipo → os 2 eventos
  apareceram na timeline com ator "Gabriel Krull" e horário. Dados de teste revertidos
  e `audit_logs` zerada (Miguel começa com a auditoria limpa).

## ✅ Teste de integração de RLS (10/06)

- `integration/rls.test.ts` + `vitest.integration.config.ts` (env node, lê `.env.local`).
  Roda com **`pnpm test:rls`** (exige Docker + seed). Fora do `pnpm test` padrão.
- Loga como motorista (anon key + senha) e prova o isolamento por cargo:
  vê só o veículo atribuído e seus documentos, só o próprio perfil e os próprios
  documentos; **não** lê veículo/documentos alheios nem a auditoria; **pode** ler
  empresas. Controle: o service role vê a frota inteira (base não está vazia).
- **10/10 testes passando.** Unitários seguem 7/7 (integração excluída do run padrão).

## ✅ Excluir documento (10/06)

- `deleteDriverDocument` (espelho do de veículo, auditado) + `DeleteDocButton`
  (client, `window.confirm` + `useTransition` + `router.refresh`) nos cards de
  documento de **veículo e motorista**. Soft delete (`deleted_at`) — some da lista
  e dos alertas, mas o histórico/auditoria fica. CSS `.d-mini-btn.danger` (hover vermelho).
- **Verificado no browser**: excluí o CRLV do MJE-8F98 → sumiu do card (ao vivo e
  após reload), `deleted_at` setado no banco, auditoria registrou "delete". Restaurado.

## ✅ Auditoria: filtros, paginação e export (10/06)

- Página própria `/configuracoes/auditoria` (admin-only): filtros por entidade,
  ação e autor (via querystring, `AuditFilters`), paginação 25/página (Anterior/Próxima),
  e **Exportar CSV** (rota `/api/audit/export`, admin-only, com BOM + `;` p/ Excel pt-BR).
- `getAuditPage`/`getAuditForExport`/`getAuditActors` em `src/lib/data/audit.ts`;
  rótulos compartilhados em `src/lib/audit-labels.ts`.
- Configurações: a seção Auditoria virou resumo (8 últimos) com botão "Ver tudo".
- **Verificado no browser** com 30 eventos de teste: lista 25 + "1–25 de 30",
  filtro entidade=Veículo → 6 (todos veículo), página 2 → "26–30 de 30",
  export CSV (200, attachment, escaping correto). Eventos de teste limpos.

## ⏳ Verificação pendente (Miguel testar no browser)

O preview MCP ficou instável (após conflito de build com o dev), então estes
itens foram verificados só por typecheck+lint+build — falta o teste de clique:

1. **Detalhe do veículo** (`/frota/[id]`): clicar na placa/seta na Frota abre o
   detalhe (hero, abas, grid de documentos). Conferir layout.
2. **Cadastrar/renovar documento**: aba Documentos → "Adicionar documento" (ou 🔄
   num doc) → preencher tipo/número/emissão/validade → Salvar. Conferir:
   - o dialog fecha ao salvar;
   - o status do doc acende certo (verde/amarelo/laranja/vermelho pela validade);
   - reflete no medidor e nos alertas do **Painel**.
3. **Pulso da frota** (Painel): hover nas barras mostra o popover (placa, modelo,
   motorista, doc mais próximo de vencer).
4. **Coverflow 3D** (Painel): arrastar os carrosséis de frota/motoristas — conferir
   o "tato" (velocidade, snap, sensação 3D); avisar se quer ajuste.

> Se algo falhar, copiar a mensagem de erro / descrever o comportamento.

## Feito

- ✅ Scaffold: Next.js 16 + TS strict + Tailwind 4 + shadcn (Base UI) + pnpm.
- ✅ Qualidade: Prettier, husky+lint-staged, Vitest (7 testes), Playwright.
- ✅ Supabase local + migration M1 (`supabase/migrations/20260603170000_m1_init.sql`):
  enums, companies(seed), profiles, driver_profiles, vehicles, vehicle_assignments,
  vehicle/driver/company_documents, audit_logs, expiry_status(), view v_expiry_alerts,
  RLS por cargo. Types gerados + clientes @supabase/ssr.
- ✅ Design system CRIS (teal #075056 + âmbar #f8c72d) nos tokens shadcn, 3 fontes,
  status .dot, tema claro. Tela de **Login** fiel ao handoff.
- ✅ **Shell** Centro de Comando: Sidebar + Topbar. Rotas /frota /motoristas
  /indicadores /configuracoes (placeholders).
- ✅ **Frota** (`/frota`): tabela premium com 15 veículos reais lendo do Supabase.
- ✅ **Painel** (`/painel`): dashboard Centro de Comando fiel ao modelo — hero,
  medidor segmentado (glow+count-up), Ação Agora, stats, Pulso da frota,
  cards cinematográficos de frota/motorista, atalhos, ocorrências.
- ✅ Seed real (`scripts/seed.mjs`): 15 veículos, 9 motoristas, 6 atribuições,
  18 documentos de **amostra** (notes='amostra', Gabriel substitui).
- ✅ **Auth real (Supabase)**: `src/proxy.ts` (refresh sessão + proteção rotas),
  server actions signIn/signOut (`src/lib/actions/auth.ts`), login wired,
  (app) layout com guarda de cargo (driver→/motorista), sidebar com usuário real
  e Sair. Leituras migradas para o cliente de sessão (RLS por cargo de verdade).
  Verificado no browser ponta a ponta.

## Pendências / próximo (ver BACKLOG.md)

1. ✅ Detalhe do veículo + cadastro/edição de documentos.
2. ✅ Detalhe do motorista + documentos pessoais.
   2b. ✅ Atribuir/trocar motorista no veículo.
3. App do Motorista (mobile) — hoje só o placeholder /motorista. **Miguel vai
   redesenhar e repensar as funções; deixar por último.**
4. Teste de integração de RLS (motorista não vê veículo alheio) — conceito exige.

Dashboard HOJE: ✅ COMPLETO (fundo animado "malha de rotas" RouteMesh +
Coverflow 3D de frota/motoristas com arrasto/setas/teclado).

## Decisões/gotchas (importante)

- Empresa do veículo é só etiqueta (sem multi-tenant); segurança por cargo (RLS).
- Motorista vê valores de manutenção/abastecimento do próprio veículo.
- `prettier-plugin-tailwindcss` remove espaço solto em className — usar string
  condicional completa (`x ? "a b" : "a"`), nunca concatenar ` " b"`.
- shadcn usa Base UI: Button sem `asChild`, usar `buttonVariants()`.
- CSS extra importado no layout.tsx (não via @import no globals — Turbopack falha).
- preview_screenshot da MCP trava no Painel (página pesada) — verificar via DOM eval.
- CPFs do seed são placeholders; empresa de todos = top_diesel (Gabriel corrige).
