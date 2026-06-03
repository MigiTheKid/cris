# Arquitetura de Páginas — TOP DIESEL

**Versão:** 1.0 — base para o design no Claude Design
**Pré-requisito:** `01-conceito.md`
**Função deste documento:** definir **o que existe na tela** antes de definir **como é visualmente**. Quem desenha o visual (Claude Design / designer) pega esse documento e produz mockups. Quem programa pega esse documento e estrutura rotas e componentes.

---

## 1. Princípios de IA (Arquitetura de Informação)

**Duas UIs distintas no mesmo produto.**
- **UI Operacional (desktop-first, com mobile responsivo):** Gabriel, Fermino, manager. Densidade alta, tabelas, filtros, edição rápida.
- **UI Motorista (mobile-first, com desktop apenas como fallback):** motorista. Enxuta, ícones grandes, áudio como entrada, raramente edita — quase tudo é leitura ou ação de 1 toque.

**Hierarquia de informação por tela.** Toda página segue ordem visual:
1. Identificação (onde estou)
2. Estado (o que tá acontecendo aqui)
3. Ação primária (o que se espera que eu faça)
4. Conteúdo principal
5. Ações secundárias

**Cores semânticas (a serem definidas no design system):**
- Verde: em dia, sucesso, ativo
- Amarelo: atenção, D-30 antes de vencer
- Laranja: alerta, D-15
- Vermelho: crítico, D-7 ou vencido
- Cinza: inativo, baixado, histórico
- Azul: informação, neutro, navegação

**Sem ícones sozinhos pra ação destrutiva.** Excluir, baixar, encerrar sempre vêm com label de texto além do ícone.

---

## 2. Shell Global (UI Operacional)

Componentes constantes em toda página da UI Operacional.

**Topo (header fixo):**
```
[Logo TOP DIESEL]                                            [🔔 Alertas]  [👤 Perfil ▼]
                                                              ⤷ 3 críticos
```

- **Não há seletor de empresa.** A frota é unificada (TOP DIESEL + Posto Planeta tratadas igual). A empresa proprietária aparece só como coluna/badge nas listagens e como filtro opcional dentro de Frota.
- **Sino de alertas** mostra contagem de alertas críticos não resolvidos. Click abre painel lateral com lista.
- **Perfil** abre menu: meus dados, trocar senha, sair.

**Lateral (nav vertical):**
```
🏠 Hoje
🚛 Frota
👤 Motoristas
📊 Indicadores
─────────
⚙️ Configurações
```

Na visão `manager`, Configurações pode aparecer restrita (sem gestão de usuários).

**Conteúdo:**
- Breadcrumb no topo (ex.: `Frota / Veículos / MJE-8F98`).
- Título da página.
- Ações primárias à direita do título.
- Filtros (se aplicável) em barra abaixo do título.
- Conteúdo principal.

**Rodapé:** mínimo. Versão do app + link "Política de Privacidade" + ano.

---

## 3. Shell Global (UI Motorista)

Mobile-first. Sem nav lateral. Tab bar inferior.

**Topo (header simples):**
```
[Foto do motorista] Olá, João              [🔔]
```

**Tab bar inferior:**
```
[🚛 Meu Veículo]  [📄 Documentos]  [✅ Checklist]  [⚠️ Ocorrência]
```

Quatro tabs, ícones grandes, sempre visíveis. Sem hambúrguer, sem menu escondido.

---

## 4. Mapa de Páginas — UI Operacional

### 🏠 HOJE (página de entrada)

**Função:** mostrar tudo que requer ação hoje, ordenado por urgência.

**Estrutura:**
```
[Saudação + data]
[Resumo em cards horizontais: 3 críticos · 7 alertas · 2 ocorrências abertas]

Seção: ALERTAS CRÍTICOS
  ⤷ Lista de itens vencidos ou D-7
  ⤷ Cada item: tipo (doc/motorista/MDF) · descrição · qual veículo/pessoa · ação rápida

Seção: TAREFAS DO DIA (M2+)
  ⤷ Checklists pendentes do dia · MDFs sem encerrar · cadastros mensais

Seção: OCORRÊNCIAS ABERTAS (M2+)
  ⤷ Lista de ocorrências reportadas por motoristas aguardando resolução

Seção: ATALHOS RÁPIDOS
  ⤷ [+ Lançar manutenção] [+ Cadastrar veículo] [+ Cadastrar motorista]
```

### 🚛 FROTA

Subpáginas:

**Frota / Veículos** — lista de todos os veículos (TOP DIESEL + Planeta juntos).
- Tabela: placa · modelo · tipo · empresa (badge) · motorista atual · status documental (badge) · ação
- Filtros: tipo, status, vencimento, empresa (opcional)
- Ação primária: `+ Novo Veículo`

**Frota / Veículos / [placa]** — detalhe do veículo, organizado em tabs:
- **Identificação:** placa, modelo, ano, tipo, capacidade, empresa proprietária, status, foto.
- **Documentos:** CRLV, CIPP, INMETRO, TARA, LAC, Modal Rodoviário. Cada um com vencimento, status colorido, link pro PDF, botão renovar.
- **Motorista atribuído:** atual + histórico de atribuições.
- **Manutenções (M3):** histórico de NFs com data, fornecedor, valor, KM.
- **Abastecimentos (M3):** histórico com KM, litros, valor.
- **Trocas de óleo (M2):** KM atual vs próxima troca, histórico.
- **Pneus (M2):** alocação atual por posição (eixo dianteiro esquerdo, etc.), histórico.
- **Ocorrências (M2):** histórico de ocorrências envolvendo esse veículo.
- **Custo/km (M3):** gráfico simples.

**Frota / Documentos** — visão consolidada de todos os documentos de veículos, ordenada por vencimento mais próximo. Filtro por tipo, por veículo, por status.

**Frota / Pneus (M2):** estoque de pneus marcados a fogo + alocação atual + movimentações.

**Frota / Manutenções (M3):** todas as manutenções da frota com filtros.

**Frota / Abastecimentos (M3):** todos os abastecimentos.

**Frota / Checklists Modelo (M2):** cadastro dos templates de checklist com recorrência.

### 👤 MOTORISTAS

**Motoristas / Lista** — tabela: nome · CPF mascarado · CNH categoria · status documental · veículo atual · ação.

**Motoristas / [nome]** — detalhe, tabs:
- **Identificação:** nome, CPF, data nascimento, foto, status (ativo/inativo), data admissão.
- **Documentos pessoais:** CNH, MOPP, toxicológico, ASO. Cada um com vencimento, status, PDF.
- **Veículo atual + histórico.**
- **Treinamentos (M3):** apresentações concluídas, capacitações.
- **Ocorrências (M2):** abertas por esse motorista.

### 📊 INDICADORES (M3)

Página dedicada a Fermino. Layout em cards de gráficos, não tabelas.

- Conformidade documental (% em dia da frota e dos motoristas)
- Custo/km por veículo, comparativo
- Manutenção por placa (frequência e valor agregado mês a mês)
- Ciclo de vida de pneus
- Alertas críticos abertos vs resolvidos no tempo

Cada card tem opção "ver detalhe" que leva pra view detalhada.

### ⚙️ CONFIGURAÇÕES

- **Usuários e permissões:** lista de usuários, role, status. Adicionar/desativar.
- **Empresas proprietárias:** dados das empresas (CNPJ, endereço, alvarás).
- **Catálogos:** tipos de documento, fornecedores recorrentes, plano de contas de manutenção, tipos de checklist.
- **Auditoria:** log de ações sensíveis (filtro por usuário, data, tipo).

---

## 5. Mapa de Páginas — UI Motorista

### 🚛 Meu Veículo (tab principal)

**Sem veículo atribuído:** mensagem "Você não tem veículo atribuído no momento. Fale com o Gabriel." + botão "Abrir Ocorrência".

**Com veículo atribuído:**
```
[Foto do veículo]
Placa: MJE-8F98
Modelo: Volvo FH 460 · Bitruck

Status documental: 🟢 Tudo em dia / 🟡 1 alerta / 🔴 2 críticos

Documentos do veículo:
  ✅ CRLV — vence em 240 dias
  ✅ CIPP — vence em 89 dias
  🔴 INMETRO — VENCIDO há 3 dias  ← destaque
  ✅ TARA — vence em 412 dias

[📞 Ligar Gabriel]  [⚠️ Abrir Ocorrência]
```

### 📄 Documentos (próprios)

```
Meus Documentos

✅ CNH — vence em 412 dias
🟡 MOPP — vence em 28 dias  ← alerta
✅ Toxicológico — vence em 180 dias
🟢 ASO — vence em 220 dias

[📞 Ligar Gabriel pra renovar]
```

### ✅ Checklist (M2)

```
Checklists do dia — [data]

⚪ Inspeção pré-viagem do tanque  → não iniciado
🟢 Verificação de extintor          → concluído às 07:14

[Iniciar checklist pendente]
```

Clicar no checklist abre formulário de itens com checkboxes e campo de foto onde exigido.

### ⚠️ Abrir Ocorrência (M2)

Fluxo direto:
1. Tela inicial: `Qual o problema?` com 4 botões grandes (Pneu / Mecânico / Documento / Outro)
2. Tela de descrição: foto obrigatória + áudio opcional + texto opcional
3. Confirmação: "Pronto, Gabriel foi avisado."

Toda ocorrência aberta aparece no Hoje do admin.

---

## 6. Matriz de Visibilidade por Cargo

Linha = página/seção. Coluna = cargo. Célula = visibilidade.

| Página/Seção | admin (Gabriel/Fermino) | manager (previsto) | driver (motorista) |
|---|---|---|---|
| Hoje | Tudo | Tudo | Versão Motorista |
| Frota / Veículos lista | Tudo | Tudo | Só veículo atribuído |
| Veículo: documentos | Tudo + editar | Tudo + editar | Leitura |
| Veículo: motorista atribuído | Tudo + editar | Tudo + editar | Só identifica seu próprio caso |
| Veículo: manutenções | Tudo (com valor) | Tudo (com valor) | Com valor (só do próprio veículo) |
| Veículo: abastecimentos | Tudo (com valor) | Tudo (com valor) | Com valor (só do próprio veículo) |
| Veículo: trocas de óleo | Tudo | Tudo | Leitura |
| Veículo: pneus | Tudo | Tudo | Leitura básica |
| Veículo: ocorrências | Tudo | Tudo | Só as próprias |
| Motoristas lista | Tudo | Tudo | Não vê |
| Motorista detalhe | Tudo + editar | Tudo + editar | Só o próprio |
| Indicadores | Tudo | Tudo | Não vê |
| Configurações | Tudo | Restrito (sem usuários) | Não vê |

**Regra base:** quando uma página é "leitura" para um cargo, todos os botões de ação (Editar, Excluir, Adicionar) ficam ocultos — não desabilitados. Visual mais limpo.

---

## 7. Padrão de Página

Toda página da UI Operacional segue esse esqueleto. Designer cria um único template e replica.

```
┌───────────────────────────────────────────────────────────────┐
│ Breadcrumb · Página atual                                     │
│                                                               │
│ Título da página                              [Ação primária] │
│ Subtítulo opcional (contagem, contexto)       [Ação secund.]  │
├───────────────────────────────────────────────────────────────┤
│ Filtros / Busca (se aplicável)                                │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│ Conteúdo principal                                            │
│ (tabela / cards / formulário / detalhe)                       │
│                                                               │
├───────────────────────────────────────────────────────────────┤
│ Paginação ou ação secundária inferior (se aplicável)          │
└───────────────────────────────────────────────────────────────┘
```

---

## 8. Estados especiais (todos os designers esquecem disso)

Cada lista, cada detalhe, cada formulário tem **6 estados** que precisam de visual definido:

| Estado | Quando aparece | Visual sugerido |
|---|---|---|
| **Carregando** | Fetch inicial | Skeleton (não spinner cheio de tela) |
| **Vazio (primeiro uso)** | Nunca houve dado | Ilustração + texto explicativo + CTA "Cadastrar primeiro X" |
| **Vazio (filtro)** | Filtro removeu tudo | Texto "Nenhum resultado pros filtros atuais" + botão "Limpar filtros" |
| **Erro de rede** | Fetch falhou | Mensagem clara + botão "Tentar novamente" + link "Reportar problema" |
| **Sem permissão** | Cargo não pode ver | Mensagem cordial + sugestão "Fale com Gabriel" |
| **Sucesso após mutação** | Salvou com sucesso | Toast verde no canto inferior direito (sonner), some em 4s |

---

## 9. Fluxos críticos (escritos em texto para o designer)

Quatro fluxos que precisam funcionar bem ou o produto falha.

### Fluxo 1: Gabriel chega segunda 8h, abre o app

1. Login (CPF + senha) → cai em **Hoje**.
2. Vê card vermelho "INMETRO MJE-8F98 vencido há 3 dias".
3. Clica → vai pra **Frota / Veículos / MJE-8F98 / aba Documentos**.
4. Clica no doc INMETRO → modal de renovação: novo número, nova validade, upload do novo PDF.
5. Salva → toast verde, alerta sai do Hoje.

Total: 4 cliques entre login e ação resolvida. **Essa é a métrica de UX**.

### Fluxo 2: Fermino abre o app no celular pra dar uma olhada

1. Login → cai em **Hoje** (responsivo, não a UI motorista).
2. Vê resumo: 0 críticos, 2 alertas amarelos, "tudo razoavelmente em dia".
3. Toca em **Indicadores** na nav.
4. Vê card "Custo/km — TOP DIESEL — março 2026: R$ X,XX".
5. Toca pra ver detalhe → gráfico por veículo.

Total: 3 toques entre login e indicador. **Sem tabela complexa no celular.**

### Fluxo 3: Motorista João, na estrada, fura pneu

1. Abre o app no celular.
2. Já cai em **Meu Veículo** (já logado).
3. Toca em **⚠️ Abrir Ocorrência** (botão grande no rodapé).
4. Toca em "Pneu" (1 dos 4 botões grandes).
5. Tira foto do pneu furado.
6. Grava áudio: "estou no km 280 da BR-101, pneu traseiro direito furou".
7. Toca em "Enviar".
8. Vê confirmação "Pronto, Gabriel foi avisado".

Total: 7 toques + 1 foto + 1 áudio. **Sem texto digitado.**

### Fluxo 4: Cadastro de um novo veículo (M1)

1. Gabriel em **Frota / Veículos** → clica `+ Novo Veículo`.
2. Formulário multi-etapa (ou single page longo):
   - Identificação (placa, modelo, ano, tipo, capacidade, foto).
   - Empresa proprietária.
   - Documentos iniciais: upload de CRLV + número + validade. Outros documentos podem ser deixados pra depois.
3. Salva → vai pra detalhe do veículo recém-criado, mostrando "Faltam: CIPP, INMETRO, TARA, LAC, Modal Rodoviário" como to-do list visível.
4. Gabriel pode atribuir motorista agora ou depois.

---

## 10. O que NÃO está nesse documento (e onde vai)

- **Tipografia, cores exatas, espaçamento:** sai do design system no Claude Design.
- **Componentes individuais (botão, input, modal):** shadcn/ui resolve, ajustes finos no design.
- **Schema SQL detalhado:** vai em `02-modelagem.md` (futuro).
- **Edge Functions e jobs assíncronos:** vai em documento próprio (futuro, M2).
- **Texto exato dos termos legais:** vai em `05-privacidade.md` (futuro).

---

## 11. Próximos passos

1. **Miguel revisa este documento** e valida especialmente: matriz de visibilidade, fluxos críticos, e a separação UI Operacional vs UI Motorista.
2. **Designer (Claude Design) recebe este documento + `01-conceito.md`** e produz:
   - Sistema de design (cores, tipografia, espaçamento, componentes base).
   - Mockup do Shell Global (operacional e motorista).
   - Mockup da página **Hoje**.
   - Mockup do detalhe de **Veículo / Documentos**.
   - Mockup da UI Motorista (Meu Veículo + Abrir Ocorrência).
3. **Miguel aprova mockups** ou pede ajustes.
4. **Início da M1 no Claude Code**, com mockups aprovados em mãos.
