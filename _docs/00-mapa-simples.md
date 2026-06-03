# Mapa Simples de Páginas — CRIS

**Nome do sistema:** **CRIS** — homenagem a **São Cristóvão**, padroeiro dos motoristas e protetor de quem está na estrada. A ideia da marca: CRIS é o parceiro que cuida da frota e avisa antes que algo dê problema.

**Para quê:** ler rápido e identificar falhas antes de detalhar schema e design.
**Como usar:** leia cada página, pergunte "falta algo aqui? sobra? está no lugar errado?".

Legenda de quem usa: 👔 Gabriel/Fermino (admin) · 🧑‍💼 Gerente (futuro) · 🚛 Motorista

---

## VISÃO GERAL (2 aplicativos no mesmo sistema)

```
                    ┌──────────────────┐
                    │   🔐 LOGIN CRIS   │  (porta de entrada única)
                    └────────┬─────────┘
              ┌──────────────┴───────────────┐
              ▼                               ▼
┌─────────────────────────────────┐   ┌──────────────────────────┐
│      PAINEL OPERACIONAL          │   │     APP DO MOTORISTA      │
│      (computador / celular)      │   │   (celular, bem simples)  │
│      👔 Gabriel · Fermino        │   │   🚛 Motorista            │
├─────────────────────────────────┤   ├──────────────────────────┤
│  [SIDEBAR]                       │   │  🚛 Meu Veículo          │
│  🏠 Painel                       │   │  📄 Meus Documentos      │
│  🚛 Frota                        │   │  ✅ Checklist do Dia     │
│  👤 Motoristas                   │   │  ⚠️ Abrir Ocorrência     │
│  📊 Indicadores                  │   │                          │
│  ⚙️ Configurações                │   │                          │
└─────────────────────────────────┘   └──────────────────────────┘
```

O sistema **detecta o cargo no login** e leva cada um pro lugar certo: admin/gerente caem no Painel Operacional, motorista cai no App do Motorista.

---

# PARTE 0 — ENTRADA

## 🔐 LOGIN
**O que é:** a porta de entrada do CRIS. Única tela para todos os cargos.
**Mostra:**
- Logo CRIS (com identidade ligada a São Cristóvão / estrada).
- Campo **CPF** + campo **Senha**.
- Botão "Entrar".
- Link "Esqueci minha senha" (recuperação por e-mail quando houver; motorista sem e-mail pede ao Gabriel).
**Faz:**
- Valida CPF + senha.
- No **primeiro acesso**: força troca de senha + aceite do termo de uso.
- Detecta o cargo e redireciona (admin/gerente → Painel; motorista → App do Motorista).
**Pergunta de revisão:** login por CPF é confortável pro motorista, ou seria melhor algo ainda mais simples (ex.: o Gabriel cadastra e entrega usuário/senha prontos)?

## 🧭 SIDEBAR (menu lateral do Painel Operacional)
**O que é:** a navegação fixa à esquerda no computador; vira menu recolhível no celular.
**Itens:** 🏠 Painel · 🚛 Frota · 👤 Motoristas · 📊 Indicadores · ⚙️ Configurações.
**Comportamento:**
- Marca em destaque a página atual.
- No celular, recolhe para ícone de menu (☰) pra sobrar tela.
- Rodapé da sidebar: nome e foto do usuário + botão sair.
- O gerente vê Configurações em modo restrito; o motorista não usa sidebar (ele tem o app próprio).

---

# PARTE 1 — PAINEL OPERACIONAL (👔)

## 🏠 PAINEL (dashboard principal)
**O que é:** a primeira tela do admin/gerente ao entrar. Junta "o que precisa de ação" com uma visão visual e bonita da frota e dos motoristas.
**Layout, de cima pra baixo:**

1. **Faixa de alertas críticos** (topo) — vencidos ou vencendo em 7 dias (documento de veículo, de motorista ou da empresa). Clicar leva direto ao item.

2. **🎠 Carrossel FROTA** — cards dos veículos passando em rolagem horizontal.
   - Cada card: foto do veículo · placa · tipo · uma "luz" de status (🟢 em dia / 🟡 atenção / 🔴 crítico).
   - Clicar no card abre a ficha do veículo.
   - Pensado para ser visualmente atraente — bater o olho e entender a saúde da frota.

3. **🎠 Carrossel MOTORISTAS** — cards dos motoristas em rolagem horizontal.
   - Cada card: foto · nome · veículo atual · luz de status dos documentos dele.
   - Clicar abre a ficha do motorista.

4. **Atalhos rápidos** — lançar manutenção · cadastrar veículo · cadastrar motorista.

5. *(M2+)* Tarefas do dia e ocorrências abertas pelos motoristas.

**Sobre o carrossel:** começa simples (rolagem horizontal de cards bonitos). Há a ideia de evoluir pra um carrossel mais sofisticado/3D numa milestone futura — mas o conceito de "ver frota e motoristas como cards navegáveis" já entra cedo.
**Pergunta de revisão:** o carrossel deve mostrar **todos** os veículos/motoristas, ou só os que precisam de atenção? (Com 13 veículos cabe mostrar todos; pense no futuro se a frota crescer.)

---

## 🚛 FROTA
A área que gira em torno dos **veículos**.

### Frota → Lista de Veículos
**O que é:** tabela com todos os veículos (TOP DIESEL + Planeta juntos).
**Mostra:** placa · modelo · tipo · empresa · motorista atual · está tudo em dia? (cor) · abrir.
**Faz:** filtrar, buscar, cadastrar novo veículo.

### Frota → Veículo (detalhe de uma placa)
**O que é:** a "ficha completa" de um veículo, em abas.
- **Identificação:** placa, modelo, ano, tipo, capacidade, empresa, foto, status.
- **Documentos:** CRLV, CIPP, INMETRO, TARA, LAC, Modal Rodoviário — cada um com vencimento e PDF anexado.
- **Motorista:** quem está nele agora + histórico.
- **Manutenções** *(M3)*: histórico de NFs (data, fornecedor, valor, km).
- **Abastecimentos** *(M3)*: histórico (km, litros, valor).
- **Trocas de óleo** *(M2)*: km atual vs próxima troca.
- **Pneus** *(M2)*: quais pneus estão alocados e em qual posição.
- **Ocorrências** *(M2)*: problemas relatados nesse veículo.
- **Custo/km** *(M3)*: gráfico simples.

### Frota → Documentos (visão geral)
**O que é:** todos os documentos de todos os veículos, ordenados pelo que vence primeiro.
**Para quê:** ver de uma vez o que está vencendo na frota inteira.

### Frota → Pneus *(M2)*
**O que é:** estoque de pneus marcados a fogo + onde cada um está alocado + movimentações (entrou, saiu, trocou de veículo).

### Frota → Manutenções *(M3)*
**O que é:** todas as manutenções da frota num lugar só, com filtros.

### Frota → Abastecimentos *(M3)*
**O que é:** todos os abastecimentos, com filtros.

### Frota → Checklists Modelo *(M2)*
**O que é:** onde você cria os modelos de checklist (ex.: inspeção diária do tanque) e define a frequência.

---

## 👤 MOTORISTAS
A área que gira em torno das **pessoas que dirigem**.

### Motoristas → Lista
**Mostra:** nome · CPF · categoria CNH · está com documento em dia? · veículo atual · abrir.

### Motoristas → Motorista (detalhe)
- **Identificação:** nome, CPF, nascimento, foto, admissão, status.
- **Documentos pessoais:** CNH, MOPP, toxicológico, ASO — com vencimento e PDF.
- **Veículo atual + histórico.**
- **Treinamentos** *(M3)*: apresentações/capacitações feitas.
- **Ocorrências** *(M2)*: as que ele abriu.

---

## 📊 INDICADORES *(M3)*
**O que é:** a tela do Fermino. Gráficos, não tabelas.
**Mostra:**
- % da frota com documentos em dia.
- Custo/km por veículo (comparação).
- Manutenção por placa (frequência e valor por mês).
- Ciclo de vida dos pneus.
- Alertas abertos vs resolvidos ao longo do tempo.

---

## ⚙️ CONFIGURAÇÕES
**O que é:** ajustes do sistema (só admin).
- **Usuários e permissões:** quem acessa, qual cargo, ativar/desativar.
- **Empresas:** dados de TOP DIESEL e Posto Planeta (CNPJ, endereço, alvarás).
- **Catálogos:** tipos de documento, fornecedores, tipos de manutenção, tipos de checklist.
- **Auditoria:** registro de quem mexeu em quê (ações sensíveis).

---

# PARTE 2 — APP DO MOTORISTA (🚛)

Bem simples. 4 botões grandes embaixo. Tudo pensado pro celular.

## 🚛 Meu Veículo
**Mostra:** foto, placa e modelo do veículo atribuído a ele agora.
- Status: tudo em dia / tem alerta / tem vencido.
- Lista dos documentos do veículo com quantos dias faltam pra vencer.
- Botões: ligar pro Gabriel · abrir ocorrência.
- Se não tem veículo: "fale com o Gabriel".

## 📄 Meus Documentos
**Mostra:** os documentos pessoais dele (CNH, MOPP, toxicológico, ASO) com vencimento.
- Alerta colorido quando algo está perto de vencer.

## ✅ Checklist do Dia *(M2)*
**Mostra:** os checklists que ele precisa fazer hoje (ex.: inspeção do tanque).
- Abre lista de itens com marcar/desmarcar e foto onde for exigido.

## ⚠️ Abrir Ocorrência *(M2)*
**Para quê:** relatar um problema (pneu, mecânico, documento, outro).
- Escolhe o tipo (4 botões grandes) → tira foto → grava áudio → envia.
- Gabriel recebe na hora, aparece no "Hoje" dele.

---

# PERGUNTAS PARA VOCÊ REVISAR

Marque o que precisa mudar:

1. **Falta alguma página?** Ex.: tela de relatório pra imprimir? Tela de fornecedores? Algo do dia a dia do Gabriel que não está aqui?
2. **Sobra alguma página?** Algo que parece desnecessário no começo?
3. **O motorista deveria fazer mais alguma coisa** além de ver veículo/documentos, checklist e ocorrência?
4. **A divisão Frota × Motoristas faz sentido**, ou tem coisa que você procuraria no lugar errado?
5. **MDF / Manifestos** — onde isso deve aparecer? (Hoje está previsto só como alerta no "Hoje", na M3.) Faz sentido ter uma área própria?
6. **Cadastros externos** (VIBRA, RAIZEN, BEST, IPIRANGA) — está previsto como alerta de "re-cadastrar". Você quer uma página listando o status de cada distribuidora?
7. **Custo/km e DRE** — o quanto disso você quer ver dentro do app, e o quanto continua no Gescor?
