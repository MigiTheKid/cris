# Handoff de Execução — CRIS (como o Claude Code opera)

**Função:** regras de operação no dia a dia. Define onde tenho autonomia, onde paro, como uso método, e o que é "pronto". Aprovado por Miguel em jun/2026.

---

## 1. Autonomia — ajo sozinho (sem perguntar)

- Ler qualquer arquivo do projeto.
- Rodar `lint`, `typecheck`, testes, `build`, e o dev server.
- `pnpm install` de dependências **já aprovadas** (as do conceito).
- Criar/editar componentes, páginas, estilos, hooks, utilitários, testes.
- Correção de tipos, refactor que não muda contrato, comentários, formatação.
- Gerar e atualizar o preview na Vercel.
- Atualizar `PROGRESS.md`, `CHANGELOG.md`, `BACKLOG.md`.

## 2. Paro e confirmo (zona de risco)

- Mudança de schema, **nova migration**, ou alteração de **RLS**.
- Nova dependência > ~100 KB ou nova conta/serviço externo.
- Mudança em **fluxo de auth** ou em **política de retenção/privacidade**.
- Qualquer **custo recorrente novo** (> R$ 50/mês) ou config de billing (ex.: Supabase Pro).
- Deletar dados, migration destrutiva, `git push --force`, mexer na `main` protegida.
- Mudar uma decisão registrada nos `_docs`.

> Em zona de risco, eu explico o que vou fazer e por quê, e espero seu OK. Fora dela, sigo e te mostro o resultado.

## 3. Método (superpowers)

| Quando | Skill | Rigidez |
|---|---|---|
| Feature grande/ambígua | `brainstorming` | flexível |
| Planejar milestone | `writing-plans` + `executing-plans` | flexível |
| **RLS** e lógica pura sensível | `test-driven-development` | rígida na RLS; pragmática no resto |
| Algo quebra | `systematic-debugging` | rígida |
| Antes de entregar | `verification-before-completion` | rígida |
| Abrir/receber PR | `requesting-code-review` / `receiving-code-review` | flexível |

**Política de TDD:** obrigatório nas políticas de RLS (segurança — não negocio). Na demais lógica pura (status de vencimento, custo/km) uso quando ajuda; **se estiver atrasando o ritmo, deixo sem** e cubro com teste depois. Sem cerimônia em tarefa trivial.

**Não uso por enquanto:** worktrees, subagentes paralelos. Solo e sequencial pra você acompanhar. Reavalio se crescer.

## 4. Git e PR

- Branch `main` protegida; **PR por feature**, Miguel revisa antes do merge.
- Migra pra merge automático (CI verde) quando o fluxo estiver de confiança.
- Conventional Commits (`feat:`, `fix:`, `chore:`, `test:`, `docs:`...).
- Co-autoria do Claude no rodapé do commit.
- `CHANGELOG.md` por milestone (não por commit).

## 5. CI/CD (GitHub Actions)

- Cada PR roda: typecheck + lint + unit + **testes de RLS**.
- PR pra `main` roda também E2E (Playwright).
- CI verde é pré-requisito de merge.
- Pre-commit (husky + lint-staged): lint/format no que mudou + checagem "secret sem `NEXT_PUBLIC_` não vaza pro client".

## 6. Visualização contínua

- **SessionStart hook** (a ativar ao fim do scaffold da M1): sobe `pnpm dev` em background e imprime o link local no início de cada sessão — você não precisa pedir.
- A cada milestone, deploy de preview na Vercel.

## 7. Segredos

- `.env.local` fora do Git (no `.gitignore`).
- Secrets sem prefixo `NEXT_PUBLIC_` **jamais** chegam ao frontend.
- Eu não crio contas nem manuseio credenciais — Miguel configura na Vercel/GitHub/Supabase.

## 8. Definition of Done (por feature)

1. Funciona no browser (verificado por mim, não presumido).
2. Typecheck + lint + testes verdes.
3. Se tem tabela sensível nova: teste de RLS por cargo presente.
4. Sem secret vazando pro client.
5. `PROGRESS.md` atualizado.
6. PR aberto com descrição clara do que mudou e como testar.

## 9. Idioma e convenções

- Identificadores/código/tabelas em **inglês** (mantendo termos de domínio sem tradução boa: `cpf`, `placa`→`plate`).
- UI 100% **português-BR**. Comentários em português.
- Timezone `America/Sao_Paulo`, datas `dd/mm/aaaa`, moeda `R$`.

---

**Este documento e o `04-decisoes-abertas.md` regem a execução. Mudança neles é zona de risco (item 2).**
