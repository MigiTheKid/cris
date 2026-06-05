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

1. Detalhe do veículo + cadastro/edição de documentos (acende status reais; é o
   que torna os dados de amostra desnecessários).
2. Detalhe do motorista + documentos pessoais.
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
