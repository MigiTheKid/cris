# Decisões Abertas — CRIS (decidir antes de codar)

**Função:** listar tudo que os outros documentos NÃO cobrem e que eu precisaria decidir sozinho durante a implementação. Miguel decide aqui, em bloco, antes do primeiro commit.

**Como ler:** cada item tem **Decisão**, opções e **➜ Recomendação**. Se concordar com a recomendação, não precisa escrever nada — só me diga "vai com as recomendações, exceto X, Y, Z".

Status: ✅ **TODAS aprovadas** (jun/2026 — Miguel: "vai com as recomendações"). As regras de execução viraram o `05-handoff-execucao.md`.

## ✅ Decisões já tomadas (jun/2026)

- **B1 — Banco dev:** Supabase **local** via Docker (Miguel tem/quer Docker). Prod na nuvem sa-east-1.
- **B7 — Local do código:** mover para **`C:\dev\cris`** (caminho limpo, sem espaços/acento). Levo os `_docs` junto.
- **B5 — Domínio:** **`*.vercel.app`** por enquanto; domínio próprio depois.
- **A3 + A5 — Modelo de trabalho:** **PR-por-feature** (Miguel revisa antes do merge) + **allowlist de autonomia** (ajo sozinho em baixo risco; paro em schema/RLS/auth/novas deps/contas/custos/deleções).

---

## A. Como conduzimos o projeto (processo)

**A1. Rigor de testes (superpowers / TDD).**
Opções: (a) TDD estrito em tudo; (b) pragmático — TDD só onde paga (lógica pura + RLS), resto com teste após; (c) testes mínimos.
➜ **Recomendação: (b).** TDD obrigatório em lógica pura (status de vencimento, custo/km) e em **toda política de RLS**. UI e CRUD: teste após, smoke E2E nos fluxos críticos. É o "troféu compacto" do conceito.

**A2. Uso de skills (superpowers).**
➜ **Recomendação:** uso `brainstorming` antes de features grandes/ambíguas; `systematic-debugging` quando travar; `verification-before-completion` antes de dizer "pronto". Não faço cerimônia em tarefa trivial. Você pode sempre pedir um modo mais solto.

**A3. Fluxo de Git.**
Opções: (a) trunk solo — commits direto na `main`, CI como porteiro; (b) PR por feature, eu abro PR e você revisa antes do merge; (c) PR por feature com merge automático se CI verde.
➜ **Recomendação: (b) no começo** (você quer enxergar o que entra), migrando pra (c) quando confiar no fluxo. Branch `main` protegida exigindo CI verde.

**A4. Padrão de commit e changelog.**
➜ **Recomendação:** Conventional Commits (`feat:`, `fix:`, `chore:`...). `CHANGELOG.md` atualizado por milestone (não por commit). Co-autoria do Claude no rodapé.

**A5. Onde fico autônomo vs onde paro pra perguntar** (vira allowlist no `settings.json`).
➜ **Recomendação — autônomo (sem perguntar):**
- ler arquivos, rodar lint/typecheck/testes/build, `pnpm install` de deps já aprovadas
- criar/editar componentes, páginas, estilos, testes
- correção de tipos, refactor sem mudar contrato, comentários
- subir o dev server, gerar preview
➜ **Recomendação — paro e confirmo (zona de risco):**
- mudança de schema / migration nova / alteração de RLS
- nova dependência > ~100 KB ou nova conta/serviço externo
- mudança em fluxo de auth ou em política de retenção/privacidade
- qualquer custo recorrente novo (> R$ 50/mês) ou config de billing
- deletar dados, rodar migration destrutiva, force-push

**A6. Idioma do código.**
Opções: (a) identificadores em inglês + UI/textos em português; (b) tudo em português; (c) tudo em inglês.
➜ **Recomendação: (a).** Código/variáveis/tabelas em inglês (padrão da stack), **mas mantendo termos de domínio que não têm tradução boa** (`placa`, `cpf`, `motorista` pode virar `driver`). UI 100% português-BR. Comentários em português.

---

## B. Infraestrutura, banco e hospedagem

**B1. Ambiente de desenvolvimento do banco.**
Opções: (a) Supabase **local** (CLI + Docker) pra dev, cloud só pra prod; (b) projeto Supabase **cloud de dev** + outro de prod; (c) um único projeto cloud servindo tudo.
➜ **Recomendação: (a) se você tiver Docker, senão (b).** Local é grátis, rápido e seguro pra testar migration/RLS sem sujar dado real. Prod fica num projeto cloud sa-east-1. *Preciso saber se você tem/quer Docker na sua máquina Windows.*

**B2. Quantidade de ambientes.**
➜ **Recomendação:** 2 — `dev` (local ou projeto free) e `prod` (cloud sa-east-1). Sem `staging` separado no começo (preview da Vercel cobre).

**B3. Plano Supabase.**
➜ **Recomendação:** começa Free. Migra pra Pro (~R$130/mês) quando: banco > 400 MB, storage > 800 MB (provável cedo, por causa dos PDFs) ou precisar PITR. **Migração exige seu OK explícito** (custo recorrente).

**B4. Hospedagem do app.**
➜ **Recomendação:** Vercel Hobby. Preview deploy automático por branch/PR. Prod na `main`.

**B5. Domínio.**
Opções: (a) subdomínio `*.vercel.app` no começo; (b) domínio próprio (ex.: `cris.topdiesel.com.br` ou similar) já.
➜ **Recomendação: (a) agora**, domínio próprio quando for pra mão dos motoristas (M1 fim / M2). *Você tem um domínio da TOP DIESEL disponível?*

**B6. Quem cria as contas externas.**
➜ Você cria manualmente (GitHub repo privado, Vercel, Supabase, e OpenAI só na M2). Eu não crio conta nem manuseio credencial. Você me passa as chaves via `.env.local` (que fica fora do Git) e configura os secrets na Vercel/GitHub. *Confirmo a lista de secrets quando inicializarmos.*

**B7. Onde o código mora no disco.**
➜ **Recomendação:** o app Next.js fica em `02 GENTE&GESTÃO/topdiesel/` (os `_docs/` já estão lá dentro). `git init` nessa pasta. *Atenção:* o caminho tem espaços e acento ("GENTE&GESTÃO") — funciona, mas se você puder, um caminho sem espaços/acentos (ex.: `C:\dev\cris`) evita dor de cabeça com algumas ferramentas. *Você prefere mover ou mantém aqui?*

**B8. Auto `run dev` no início de cada sessão.**
➜ **Recomendação:** SessionStart hook no `settings.json` que sobe `pnpm dev` em background e imprime o link local. **Ativo isso ao fim do scaffold da M1** (antes não há app). Combinado.

---

## C. Produto e domínio (não coberto nos docs)

**C1. Login do motorista.**
Opções: (a) motorista digita CPF + senha; (b) Gabriel cadastra e entrega credencial pronta; (c) link mágico por WhatsApp/SMS.
➜ **Recomendação: (a) + (b)** — login por CPF, mas com senha definida pelo Gabriel no cadastro e troca forçada no 1º acesso. Sem SMS/WhatsApp no começo (custo + complexidade).

**C2. Como os alertas chegam ao usuário.**
Opções: (a) só dentro do app; (b) app + e-mail; (c) app + WhatsApp.
➜ **Recomendação: (a) na M1** (só in-app, sino + Painel). E-mail/WhatsApp entram depois se houver demanda real (WhatsApp tem custo e burocracia de API).

**C3. Locale e formatos.**
➜ **Recomendação (sem discussão, só confirmando):** timezone `America/Sao_Paulo`, datas `dd/mm/aaaa`, moeda `R$` (BRL), número com vírgula decimal.

**C4. Política de senha.**
➜ **Recomendação:** mínimo 6 caracteres, sem exigência de símbolo (motorista com baixa familiaridade digital). Bloqueio após N tentativas via Supabase. Simplicidade > rigor aqui.

**C5. Documentos repetidos do mesmo tipo (renovação).**
Decisão: quando o CRLV é renovado, mantenho o antigo no histórico ou substituo?
➜ **Recomendação:** mantém histórico (várias linhas), mostra só o **vigente** por padrão, com "ver histórico". O vencimento ativo é sempre o mais recente não vencido/mais futuro.

**C6. Fotos (veículo e motorista).**
➜ **Recomendação:** opcionais. Veículo sem foto mostra ícone do tipo (caminhão/leve). Útil pro carrossel ficar bonito, mas não bloqueia cadastro.

**C7. Importação inicial dos dados.**
Decisão: como entram os 13 veículos + 9 motoristas + documentos que já estão no gdrive?
Opções: (a) cadastro manual na tela; (b) importador via CSV/XLSX que eu construo; (c) eu leio os arquivos da pasta e gero um seed.
➜ **Recomendação: (c) para o esqueleto** (eu leio a estrutura da pasta `01 TOP DIESEL GDRIVE` e gero um seed com placas, nomes e tipos) **+ (a)** você/Gabriel completa datas e anexa PDFs na tela. Importador CSV (b) só se o volume crescer.

**C8. Restauração de registro deletado (soft delete).**
➜ **Recomendação:** só `admin` restaura, via tela de Configurações. Motorista/manager nunca deletam veículo/motorista.

**C9. Retenção e descarte (LGPD).**
➜ **Recomendação (confirmar):** documentos pessoais 5 anos pós-desligamento (CLT); ASO 20 anos (NR-7); áudio bruto de ocorrência 7 dias (mantém transcrição). Vira a "Política Interna de Retenção" revisada por advogado depois.

---

## D. Frontend e design

**D1. Enquanto o design do Claude Design não chega.**
➜ **Recomendação:** faço o scaffold com tema neutro shadcn/ui (cinza/zinc) e troco pelos tokens do seu design quando ele chegar. Não fico parado esperando o visual.

**D2. Dark mode.**
➜ **Recomendação:** não na M1. Estrutura preparada (tokens), mas só claro no começo.

**D3. PWA (instalar CRIS como app no celular do motorista).**
➜ **Recomendação:** sim, mas na M2. Deixa o app "instalável" no celular do motorista melhora muito a adoção. M1 entrega web responsivo.

**D4. Biblioteca do carrossel.**
➜ **Recomendação:** Embla (que o shadcn já usa) para o carrossel 2D do Painel na M1/M2. A versão 3D sofisticada fica como ideia de milestone futura (não bloqueia nada).

**D5. Ícones e logo do CRIS.**
➜ Vêm do seu design. Enquanto isso uso `lucide-react` + um placeholder textual "CRIS".

---

## E. CI/CD e qualidade

**E1. O que o CI roda em cada PR.**
➜ **Recomendação:** typecheck + lint + unit + testes de RLS. E2E (Playwright) roda em PR pra `main`. CI verde é obrigatório pra merge.

**E2. Pre-commit hooks.**
➜ **Recomendação:** husky + lint-staged rodando lint/format no que mudou + checagem de "secret sem prefixo NEXT_PUBLIC_ não vaza pro client".

**E3. Cobertura de testes — meta.**
➜ **Recomendação:** sem meta numérica de cobertura (gera teste-lixo). Meta qualitativa: toda lógica pura testada, toda RLS testada, fluxos críticos com E2E.

---

## Resumo das perguntas que realmente preciso de você

A maioria acima é "aprovo a recomendação". Mas **estas dependem de fato seu** (não dá pra eu assumir):

1. **B1** — você tem/quer **Docker** no Windows? (define dev local vs cloud)
2. **B5** — existe **domínio** da TOP DIESEL disponível pra usar?
3. **B7** — mantém o código na pasta atual (com espaços/acento) ou move pra um caminho limpo tipo `C:\dev\cris`?
4. **A3/A5** — concorda com **PR-por-feature + allowlist de autonomia** como proposto?

O resto: me diga "vai com as recomendações" e eu sigo.
