# CRIS — Colocar no ar (deploy)

Guia para publicar o sistema e liberar acesso aos funcionários.
**Estratégia escolhida:** grátis primeiro · migrar os dados reais · link grátis (`*.vercel.app`).

Legenda das etapas:

- **[VOCÊ]** — precisa ser feito por você (criar conta, clicar conectar). Não dá pra eu fazer por você (criar conta / digitar senha sua).
- **[CRIS]** — eu faço o lado técnico (migrations, dados, variáveis, código).

---

## Visão geral

```
GitHub (código)  ──►  Vercel (app Next.js)  ──►  funcionários acessam o link
                          │
                          ▼
                 Supabase Cloud (banco + login + arquivos)
```

Depois de pronto: **a gente desenvolve → eu dou `git push` → Vercel publica sozinho em ~1 min**, sem parar o sistema e sem ninguém reinstalar nada.

---

## Parte 1 — GitHub (guardar o código)

1. **[VOCÊ]** Crie uma conta em <https://github.com> (grátis), se ainda não tiver.
2. **[VOCÊ]** Crie um repositório **privado** chamado `cris` (sem README, sem nada — vazio).
3. **[CRIS]** Eu conecto o projeto local a esse repositório e subo todo o código + histórico.

> Resultado: o código fica seguro na nuvem e vira a fonte das publicações.

---

## Parte 2 — Supabase Cloud (banco, login e arquivos)

1. **[VOCÊ]** Crie conta em <https://supabase.com> (pode entrar com o GitHub).
2. **[VOCÊ]** Crie um projeto:
   - **Name:** `cris-topdiesel`
   - **Region:** `South America (São Paulo)` — mais perto = mais rápido.
   - **Database Password:** gere uma forte e **guarde** (cofre/gerenciador de senhas).
   - Plano: **Free**.
3. **[CRIS]** Aplico nossas _migrations_ no projeto novo (cria todas as tabelas, RLS, permissões e os "baldes" de PDF/foto) e **migro os dados reais** (frota, motoristas, engates, pneus, usuários).
4. **[VOCÊ]** Em **Project Settings → API**, copie os 3 valores (eu te digo onde colar — eles **não** vão pelo chat):
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` → `SUPABASE_SERVICE_ROLE_KEY` (secreto — nunca exponha)

> **Arquivos já enviados** (PDFs de documento, fotos): se houver poucos, a gente re-sobe pela própria tela depois. O banco e os cadastros vão completos.

---

## Parte 3 — Vercel (publicar o app)

1. **[VOCÊ]** Crie conta em <https://vercel.com> entrando **com o GitHub**.
2. **[VOCÊ]** **Add New → Project** e selecione o repositório `cris`.
3. **[VOCÊ]** Em **Environment Variables**, cole as 3 chaves da Parte 2 (cada uma para os ambientes Production/Preview/Development).
4. **[VOCÊ]** Clique **Deploy**. Em ~2 min o app está no ar.
5. **[VOCÊ]** O endereço sai como `cris-topdiesel.vercel.app` (ou parecido). Esse é **o link da equipe**.

> O build local já foi validado, então o deploy deve passar de primeira.

---

## Parte 4 — Primeiro acesso dos funcionários

- Mande o link (`...vercel.app`) pra equipe — funciona em **qualquer navegador, no PC ou no celular**.
- Cada um entra com **CPF + senha provisória** (`mudar123`) e o sistema **força a troca** no primeiro login.
- Cargos: **admin** (você), **gestor** (equipe interna) e **motorista**. Quem vê o quê já está garantido pelas permissões (RLS).
- Crie/edite usuários em **Configurações → Usuários**.

---

## Parte 5 — Como a gente atualiza daqui pra frente

1. A gente desenvolve a próxima função aqui.
2. **[CRIS]** dou `git push`.
3. **Vercel publica automaticamente** — a equipe vê a versão nova sem fazer nada, sem downtime.
4. Mudanças no banco (novas tabelas/colunas) eu aplico via _migration_ no Supabase Cloud, do mesmo jeito controlado de hoje.

> Cada mudança ainda ganha um **link de preview** antes de ir pra produção, pra você aprovar.

---

## Quando subir de plano (futuro, opcional)

Sinais de que vale ir pro pago (~R$ 250/mês total):

- O sistema virou **crítico** no dia a dia → Supabase **Pro** (backup diário automático, sem risco de "dormir").
- Uso comercial firme → Vercel **Pro** (licença adequada, mais limites).

Nada disso bloqueia começar agora no grátis. A migração de grátis → pago é um clique, sem reconfigurar nada.
