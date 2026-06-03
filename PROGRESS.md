# PROGRESS — CRIS

Estado do projeto para retomar a qualquer momento.

## Como rodar

- Banco: Docker Desktop aberto → `pnpm exec supabase start` (já inicializado).
- App: `pnpm dev` → **http://localhost:3210** (porta fixa; a 3000 é de outro projeto).
- Supabase Studio: http://localhost:54323
- Re-semear dados de exemplo: `node --env-file=.env.local scripts/seed.mjs`
- Login de teste: CPF `000.000.000-00` / senha `mudar123` (admin Gabriel Krull) — **auth ainda não conectado**, o botão Entrar só navega.

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

## Pendências / próximo (ver BACKLOG.md)

1. **Login real (auth Supabase)** — alta prioridade. Hoje tudo lê via cliente
   admin TEMPORÁRIO (`src/lib/supabase/admin.ts`, service role, ignora RLS).
   Com login, troca pelo cliente de sessão e a RLS passa a valer de verdade.
2. Detalhe do veículo + cadastro/edição de documentos (acende status reais).
3. Detalhe do motorista + documentos pessoais.
4. App do Motorista (mobile).
5. Polish do design: Coverflow 3D (hoje scroll horizontal) + fundo animado
   "malha de rotas" em canvas.

## Decisões/gotchas (importante)

- Empresa do veículo é só etiqueta (sem multi-tenant); segurança por cargo (RLS).
- Motorista vê valores de manutenção/abastecimento do próprio veículo.
- `prettier-plugin-tailwindcss` remove espaço solto em className — usar string
  condicional completa (`x ? "a b" : "a"`), nunca concatenar ` " b"`.
- shadcn usa Base UI: Button sem `asChild`, usar `buttonVariants()`.
- CSS extra importado no layout.tsx (não via @import no globals — Turbopack falha).
- preview_screenshot da MCP trava no Painel (página pesada) — verificar via DOM eval.
- CPFs do seed são placeholders; empresa de todos = top_diesel (Gabriel corrige).
