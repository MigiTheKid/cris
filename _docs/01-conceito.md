# Conceito — TOP DIESEL (Sistema Operacional da Frota)

**Versão:** 1.0 — concepção inicial
**Autor:** Miguel Ploner Filho (idealizador) + Claude (parceiro de concepção)
**Ambiente de execução:** Claude Code
**Status:** documento vivo até o início da M1

---

## 1. Tese

> **O processo é o sistema. As pessoas executam, mas o conhecimento operacional fica.**

A TOP DIESEL funciona hoje porque o Gabriel está lá. Ele tem na cabeça e em planilhas dispersas no Google Drive todo o conhecimento operacional da frota: quando cada documento vence, qual veículo precisa de troca de óleo, qual pneu está alocado onde, qual MDF está pendente, qual NF de manutenção falta lançar. Buscar qualquer informação cruzada hoje depende de abrir várias planilhas e, no limite, de perguntar pro Gabriel.

O sistema é a resposta a esse risco. Não substitui o Gabriel — **estrutura o conhecimento que hoje só existe disperso**. Com a operação no app, qualquer pessoa autorizada sabe o que precisa ser feito, quando, por quem, e com qual evidência — sem depender da memória de uma pessoa.

## 2. Por que agora

Dois fatos convergem:

**Dispersão atual.** O conhecimento operacional vive em 7+ planilhas no Google Drive, NFs lançadas no Gescor, sites externos (VIBRA, RAIZEN, BEST, MultiCTE, BSoft), cadernos físicos e na cabeça do Gabriel. Buscar qualquer informação cruzada (ex.: "quanto gastei de manutenção na placa MJE-8F98 nos últimos 6 meses?") exige 30 minutos de planilha.

**Vencimentos críticos.** Documentação de TRR é regulada (ANTT, INMETRO, ambiental). Um CIPP vencido para o caminhão. Um MOPP vencido proíbe o motorista. Um LAC vencido fecha a base. O custo de esquecer um vencimento é maior que o custo de construir o alerta automático.

## 3. Princípios não-funcionais

**Evidência sempre que houver ação.** Toda manutenção lançada anexa NF. Todo checklist concluído anexa foto. Toda troca de pneu registra foto do pneu novo marcado. Sem evidência, a ação não foi feita — só anotada.

**O Gescor não é substituído na função fiscal.** Continua sendo a fonte da NF eletrônica e da SEFAZ. Nosso sistema substitui a **memória operacional** que hoje deriva das NFs do Gescor: histórico por placa, custo/km, agregados. Lançamento aqui pode ser paralelo (manual) ou via integração futura, se houver API. Em nenhum momento o sistema emite NF.

**Acessibilidade adaptada ao perfil.** Gabriel e Fermino usam interface densa, com tabelas e filtros. Motorista usa interface enxuta no celular: ele vê o veículo dele, os documentos dele, as pendências dele. Bonito não é cosmético — é retenção pro motorista que evita abrir software.

**Privacidade por arquitetura.** Motorista vê só o que é dele. Manutenção financeira (valor da NF, fornecedor, plano de contas) é restrita a Gabriel/gestor. Cada acesso a dado sensível gera audit log.

**Disciplina de escopo.** Backlog vivo entre milestones. Ideias novas pousam em `BACKLOG.md` durante o trabalho, entram na próxima M se justificadas. Custos recorrentes acima de R$ 50/mês exigem autorização explícita.

**Frota unificada, empresa é só etiqueta.** A frota do Posto Planeta é gerenciada aqui junto com a da TOP DIESEL (Gabriel já faz isso hoje). Mesmo dono, mesmo financeiro, mesma operação — todos os veículos tratados igual. A empresa proprietária é apenas um campo no cadastro do veículo, usado para filtro e identificação, nunca como separação de dados ou de acesso.

## 4. Personas

**Gabriel Krull — Logística.** Operador atual, fonte do conhecimento. Letrado, organizado, já usa gdrive intensivamente. Não tem aversão a software — tem aversão a software *que não economiza tempo*. Vai medir o produto pela métrica simples: "abro menos planilhas agora?". Se sim, adota. Se não, ignora. UX desktop densa é OK pra ele.

**Fermino — dono.** Comanda a operação. Precisa de visão executiva: "está tudo em dia?", "quanto custou esse veículo no mês?", "quem é responsável por isso?". Aversão a complexidade alta. Mobile e desktop. A persona-âncora pro design dos **Indicadores**.

**Gerente operacional — papel previsto.** Pessoa que pode dividir ou assumir a operação da logística junto/depois do Gabriel. O sistema é desenhado pra que essa pessoa consiga operar lendo o app, sem depender de repasse informal de conhecimento.

**Motorista — 9 hoje, escala para ~15.** Acesso só ao próprio veículo e aos próprios documentos. Mobile dominante. Funções essenciais: ver vencimentos do meu veículo e dos meus documentos pessoais, registrar checklist diário do veículo tanque, abrir ocorrência com foto/áudio quando algo dá problema na estrada. Perfil heterogêneo de alfabetização digital — alguns dominam, outros não. Interface enxuta, ícones grandes, áudio onde fizer sentido.

## 5. Modelo de domínio (alto nível)

Entidades centrais. Detalhe técnico de schema vai em documento separado (`02-modelagem.md`, futuro).

**Empresa.**
- `companies` — TOP DIESEL e Auto Posto Planeta. **Apenas um campo de identificação no cadastro do veículo**, usado para filtro e etiqueta. Não é fronteira de segurança nem separação de dados — toda a frota é tratada de forma unificada, o financeiro é praticamente o mesmo, e a operação é uma só.

**Pessoas.**
- `profiles` — toda pessoa do sistema (Gabriel, Fermino, motoristas). CPF único.
- `roles` — `admin` (Gabriel, Fermino), `manager` (papel previsto), `driver` (motoristas).
- `driver_profiles` — campos específicos de motorista (CNH, categoria, MOPP, toxicológico).

**Frota.**
- `vehicles` — placa, modelo, ano, tipo (Bitruck/Toco/Truck/Leve/Reboque), capacidade, `company_id` (empresa proprietária, só etiqueta), status (ativo/inativo/em manutenção).
- `vehicle_documents` — CRLV, CIPP, INMETRO, TARA, LAC, Modal Rodoviário, etc. Cada um com tipo, número, vencimento, arquivo anexado, status.
- `vehicle_assignments` — qual motorista está em qual veículo no momento. Histórico preservado.

**Operação recorrente.**
- `tasks_templates` — modelos de tarefas com recorrência (checklist diário do veículo tanque, troca de óleo por KM, cadastro mensal nas distribuidoras).
- `tasks_instances` — instâncias materializadas por dia/período, com responsável, prazo, status, evidência anexada.
- `incidents` — ocorrências reportadas (motorista relata pneu furado, gerente registra autuação). Tem evidência (foto/áudio/texto) e plano de ação opcional.
- `action_plans` — etapas de resolução de incidente com responsável e prazo.

**Manutenção e custos.**
- `maintenance_events` — manutenção realizada em um veículo. Tipo (preventiva/corretiva), data, fornecedor, valor, NF anexada, KM no momento, descrição. Lançado aqui paralelo ao Gescor.
- `fuel_records` — abastecimentos da frota. Veículo, motorista, data, litros, valor, KM, NF.
- `oil_changes` — trocas de óleo com KM atual e KM da próxima troca calculado.
- `tires` — estoque de pneus marcados a fogo. Cada pneu é único.
- `tire_movements` — alocação/realocação/baixa de pneu. Vínculo pneu↔veículo↔posição.

**Documentos institucionais.**
- `company_documents` — alvarás, Certificado de Regularidade, Modal Rodoviário das duas empresas. Mesma lógica de vencimento.
- `external_registrations` — cadastros nas distribuidoras (VIBRA/RAIZEN/BEST/IPIRANGA) com data da última atualização e periodicidade. Gera alerta de re-cadastro.

**MDF (Manifesto de Documentos Fiscais).**
- `mdf_records` — registros de MDF abertos, com prazo de encerramento, sistema de origem (MultiCTE/BSoft). Não emitimos MDF, só rastreamos pendência.

**Sistema.**
- `audit_logs` — alterações em dados sensíveis (mudança de role, edição financeira, deleção lógica).
- `alerts` — view computada sobre `vehicle_documents`, `driver_documents`, `oil_changes`, `tasks_instances` em atraso, `mdf_records` pendentes.

## 6. Decisões arquiteturais cravadas

### Empresa proprietária é só um campo

Não há multi-tenant nem RLS por empresa. Toda a frota (TOP DIESEL + Auto Posto Planeta) é tratada de forma unificada — mesmo dono, mesmo financeiro, mesma operação. O veículo carrega um `company_id` que serve apenas como etiqueta/filtro nas listagens e relatórios. Não existe seletor de empresa no topo; existe, no máximo, um filtro opcional "empresa" nas listas de frota.

A segurança de acesso é **por cargo**, não por empresa (ver Autorização abaixo).

### Autenticação

Login com CPF + senha. Email opcional (recuperação self-service quando existir). Supabase Auth com email sintético interno (`{cpf}@auth.topdiesel.local`). Recuperação para motorista sem email é via Gabriel/admin com audit log. Primeiro login força troca de senha e aceite de termo de uso.

### Autorização

RBAC com três roles, e a segurança do Supabase (RLS) é baseada em cargo:
- `admin` — Gabriel, Fermino. Tudo.
- `manager` — papel previsto do gerente operacional. Mesmo que admin, exceto configurações de sistema (decisão a refinar).
- `driver` — motorista. Vê só o próprio veículo atribuído, próprios documentos, próprios checklists do dia, abre ocorrência.

### Privacidade

Motorista vê: dados do veículo atribuído (placa, modelo, documentos com vencimento), incluindo **valores de manutenção e abastecimento do próprio veículo** — muitas manutenções acontecem na estrada e o motorista frequentemente negocia o preço junto ao gerente, então o valor é parte do trabalho dele. Vê também próprios documentos (CNH, MOPP, ASO, toxicológico), próprias tarefas/checklists, próprias ocorrências. **Não vê:** dados de outros veículos, comparativo com outros motoristas, indicadores agregados da frota.

LGPD: motorista é titular de dados pessoais (CNH, ASO, toxicológico). Termo de ciência no primeiro login. Retenção: documentos pessoais 5 anos pós-desligamento (CLT). ASO 20 anos (NR-7). Áudio bruto de ocorrência descartado em 7 dias (mantém transcrição).

### Frontend state

Zustand para estado client (modais, filtros). TanStack Query para estado server. React Hook Form + Zod. shadcn/ui + Tailwind. TanStack Table para listagens densas (frota, manutenções).

### Testes

1. TypeScript strict + ESLint + Zod compartilhados.
2. Unit em lógica pura (cálculo de próxima troca de óleo por KM, custo/km, status de vencimento D-30/D-15/D-7).
3. **Integration tests de RLS obrigatórios** para toda tabela com dados sensíveis — verificam que cada cargo (admin/manager/driver) vê só o que pode, e que motorista vê apenas o próprio veículo/documentos. PR sem teste de RLS é rejeitado.
4. E2E smoke: login motorista vê só próprio veículo, Gabriel registra manutenção com evidência, alerta D-7 aparece no dashboard.

## 7. Stack e infraestrutura

| Camada | Escolha |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| Linguagem | TypeScript 5.x strict + Node 24 |
| Package manager | pnpm |
| UI | Tailwind CSS 4 + shadcn/ui + lucide-react + sonner |
| Estado | Zustand + TanStack Query v5 |
| Forms | React Hook Form + Zod |
| Tabelas | TanStack Table |
| Backend / DB / Auth / Storage | Supabase (região São Paulo / sa-east-1) |
| Transcrição (ocorrências áudio motorista) | OpenAI Whisper API, hard cap USD 20/mês |
| Hosting app | Vercel |
| Versionamento | GitHub privado, repo `topdiesel-sistema` |
| CI/CD | GitHub Actions |
| Testes | Vitest + Playwright |
| Execução do desenvolvimento | Claude Code |

**Custo estimado mensal:**
- Primeiras 4-8 semanas (Free tier): ~R$ 10-20/mês
- Operação consistente (Supabase Pro): ~R$ 160-210/mês

Migração para Pro ocorre quando: banco > 400 MB, storage > 800 MB (provável cedo, por causa dos PDFs de documentos), ou necessidade de PITR. **Requer autorização explícita.**

## 8. Navegação principal (4 áreas)

Decisão cravada para o design:

- **Hoje** — o que precisa ser feito agora. Vencimentos críticos, tarefas do dia, ocorrências abertas, MDF pendente. Página de entrada do Gabriel/Fermino.
- **Frota** — cadastro mestre dos veículos, documentos do veículo, checklists modelo, pneus (estoque + alocação), manutenções, abastecimentos, trocas de óleo. Tudo orientado a veículo.
- **Motoristas** — cadastro mestre dos motoristas, documentos pessoais (CNH/MOPP/ASO), atribuições atuais e históricas, treinamentos.
- **Indicadores** — custo/km por veículo, conformidade documental, frequência de manutenção, ciclo de vida de pneu, comparativos. Persona-âncora: Fermino.

Visão **Motorista** é uma UI completamente separada (mobile-first): Meu Veículo · Meus Documentos · Meus Checklists · Abrir Ocorrência.

Detalhamento de páginas, fluxos e matriz de visibilidade em `03-arquitetura-paginas.md`.

## 9. Roadmap em milestones

Cada M tem Definition of Done verificável. Buffer obrigatório de 1-2 semanas entre Ms. Próximo M não inicia sem aprovação explícita do Miguel.

### Milestone 1 — Frota cadastrada com vencimentos vivos (35-42 dias)

**Entrega:**
- Login funcional (admin + motorista).
- Cadastro completo dos 13 veículos da TOP DIESEL + frota do Posto Planeta.
- Cadastro completo dos 9 motoristas com documentos pessoais.
- Documentos do veículo (CRLV, CIPP, INMETRO, TARA, LAC, Modal Rodoviário) cadastrados com vencimento e PDF anexado.
- Documentos do motorista (CNH, MOPP, toxicológico, ASO) cadastrados.
- **Dashboard "Hoje"** mostrando alertas de vencimento (D-30 amarelo, D-15 laranja, D-7 vermelho, vencido crítico) unificando documento de veículo, documento de motorista e empresa.
- Visão motorista mobile mostrando próprio veículo + próprios documentos.
- Termo de ciência aceito no primeiro login.

**Não entra na M1:** manutenção, abastecimento, pneus, checklists recorrentes, ocorrências, custo/km, MDF, indicadores. Ficam pra M2-M3.

**Razão do recorte:** vencimentos sozinhos já justificam o uso diário do Gabriel. Entregar isso primeiro valida arquitetura, RLS por cargo e fluxo de auth. Resto vem em cima de base sólida.

### Milestone 2 — Operação recorrente (30-35 dias)

- Checklists modelo (diário do veículo tanque, mensal de extintor).
- Instâncias diárias geradas por Edge Function.
- Trocas de óleo com KM e cálculo de próxima troca.
- Extintores com vencimento.
- Pneus: estoque + alocação por veículo + movimentações.
- Ocorrências com foto e áudio (transcrição via Whisper). Motorista abre, admin resolve.
- Cadastros externos (VIBRA/RAIZEN/BEST/IPIRANGA) com periodicidade e alerta de re-cadastro.

### Milestone 3 — Custos e indicadores (30 dias)

- Manutenção: lançamento com NF anexada, fornecedor, plano de contas, valor, KM.
- Abastecimento: lançamento por veículo/motorista.
- MDF: registro de pendência com prazo, alerta.
- **Indicadores:** custo/km por veículo, conformidade documental (% em dia), frequência e custo de manutenção por placa, ciclo de pneu.
- Export PDF da ficha do veículo e do motorista.

**Provável migração para Supabase Pro.**

### Milestone 4 — Planos de ação e auditoria (a definir)

- Planos de ação multi-etapa para incidentes graves.
- Tela de auditoria/fiscalização (registro do que foi exigido em fiscalização e como foi resolvido).
- Refinamento de relatórios para o Fermino.

## 10. Métricas de sucesso

| Janela | Estado esperado |
|---|---|
| 30 dias | App deployado e estável. Gabriel cadastrou 13 veículos + 9 motoristas. Documento vencendo aparece como alerta antes de vencer. Pelo menos 1 motorista logou no celular. |
| 90 dias | Gabriel abriu menos planilhas que antes (autorrelato + observação). Todo documento da frota tem vencimento e arquivo anexado no app. Manutenção sendo lançada paralelo ao Gescor. Custo/km visível por veículo. |
| 6 meses | Sistema é a primeira tela que Gabriel abre de manhã. Fermino consulta indicadores antes de decisão de frota. Zero documento crítico vencendo sem alerta prévio. Motorista usa o app no celular pelo menos semanalmente. |
| 1 ano | Operação documentada o suficiente para ser conduzida por qualquer pessoa autorizada lendo o app, sem depender de conhecimento informal. |

## 11. Princípios de execução com Claude Code

**Fluidez priorizada.** Claude Code opera em modo autônomo dentro de zonas de baixo risco (correção de tipos, ajustes de UI sem mudar contrato, criação de testes, comentários). Interrupção é reservada para zonas de alto risco (mudança de schema, alteração de RLS, nova dependência > 100 KB, mudança em fluxo de auth, mudança em política de retenção). Detalhes em `04-handoff-claude-code.md` (futuro).

**Visualização contínua.** A cada milestone, deploy automático para preview na Vercel. Miguel acompanha pelo browser sem precisar pedir.

**Disciplina de teste.** Toda nova tabela com dados sensíveis exige teste de RLS por cargo no mesmo PR. Toda nova feature exige pelo menos 1 unit + 1 caso E2E. CI verde é pré-requisito de merge.

**Documentação como artefato vivo.** `CHANGELOG.md` por milestone. `BACKLOG.md` recebe ideias durante o trabalho. `PROGRESS.md` mostra estado atual. Demo de 5 min gravada ao fim de cada M.

## 12. Documentos legais a produzir

- Termo de Ciência sobre Tratamento de Dados (motorista assina na admissão e aceita no primeiro login).
- Política Interna de Retenção e Descarte (entre TOP DIESEL e Auto Posto Planeta).
- Termo específico para Gravação de Áudio em ocorrências (áudio bruto descartado em 7 dias).

Documentos redigidos em versão técnica/operacional aqui, **passam por revisão de advogado trabalhista antes de entrar em vigor**.

## 13. Riscos transversais

**Conhecimento operacional concentrado no Gabriel.** Hoje a operação depende da memória e das planilhas dele. Mitigação: M1 já estrutura vencimentos e cadastro (a maior parte do que vive na cabeça); M2 e M3 cobrem o resto (recorrências, custos, ocorrências).

**Migração das planilhas.** 13 veículos, 9 motoristas, ~7 planilhas no gdrive. Trabalho manual de 1-2 semanas. Mitigação: importador via CSV/XLSX construído como utilitário interno no início da M1.

**Vendor lock-in no Supabase.** Postgres é Postgres; auth e storage são migráveis. Administrável.

**Decisão futura de absorver Pessoas (feedback áudio, ata semanal).** Quando os postos entrarem (M5+?), pode ser absorvido aqui se o domínio convergir, ou virar sistema separado. Decisão adiada — não impacta a M1-M3.

---

**Próximo artefato:** `03-arquitetura-paginas.md` — mapa de páginas, matriz de visibilidade, fluxos críticos. Base para o design no Claude Design.
