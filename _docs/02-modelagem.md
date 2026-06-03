# Modelagem de Dados — CRIS

**Versão:** 1.0 — foco na M1, com M2/M3 mapeadas em alto nível
**Pré-requisitos:** `01-conceito.md`, `00-mapa-simples.md`, `03-arquitetura-paginas.md`
**Banco:** PostgreSQL via Supabase (sa-east-1). Toda segurança via RLS **por cargo**.

---

## 1. Princípios de modelagem

- **Sem multi-tenant.** A frota é unificada. `company_id` é só etiqueta no veículo, nunca fronteira de segurança.
- **Segurança por cargo (RLS).** `admin` e `manager` veem tudo. `driver` vê só o próprio veículo atribuído e os próprios dados.
- **Soft delete em dados de negócio.** `deleted_at timestamptz` em vez de DELETE físico, para preservar histórico e auditoria. Documentos/anexos seguem regra de retenção própria.
- **Vencimento é dado, não cálculo perdido.** Toda data de validade fica numa coluna `expires_at`. O status (em dia / D-30 / D-15 / D-7 / vencido) é **derivado em runtime ou view**, nunca gravado fixo (evita dado velho).
- **Auditoria de ações sensíveis.** Mudança de cargo, reset de senha, edição financeira e soft delete escrevem em `audit_logs`.
- **Timestamps padrão.** Toda tabela: `created_at timestamptz default now()`, `updated_at timestamptz default now()` (trigger), e quando aplicável `created_by uuid references profiles(id)`.

---

## 2. Tipos enumerados (enums)

```sql
-- Cargo do usuário no sistema
create type user_role as enum ('admin', 'manager', 'driver');

-- Empresa proprietária do veículo (apenas etiqueta)
create type company_kind as enum ('top_diesel', 'posto_planeta');

-- Tipo de veículo (define, p.ex., posições de pneu)
create type vehicle_type as enum ('cavalo', 'truck', 'toco', 'bitruck', 'leve', 'semi_reboque', 'reboque');

-- Situação do veículo
create type vehicle_status as enum ('ativo', 'inativo', 'em_manutencao');

-- Categoria de documento do VEÍCULO
create type vehicle_doc_type as enum (
  'crlv',              -- Certificado de Registro e Licenciamento
  'cipp',              -- Certificado de Inspeção para Transporte de Produtos Perigosos
  'inmetro',           -- Inspeção INMETRO (tanque)
  'tara',              -- Certificado de tara / pesagem
  'lac',               -- Licença Ambiental (LAC)
  'modal_rodoviario',  -- Modal Rodoviário
  'cert_regularidade', -- Certificado de Regularidade
  'outro'
);

-- Categoria de documento do MOTORISTA
create type driver_doc_type as enum (
  'cnh',           -- Carteira de habilitação
  'mopp',          -- Movimentação de Produtos Perigosos
  'toxicologico',  -- Exame toxicológico
  'aso',           -- Atestado de Saúde Ocupacional
  'outro'
);

-- Categoria de documento da EMPRESA / predial
create type company_doc_type as enum (
  'alvara',
  'cert_regularidade',
  'modal_rodoviario',
  'licenca_ambiental',
  'outro'
);
```

---

## 3. Tabelas da M1 (detalhadas)

### 3.1 `profiles` — toda pessoa do sistema

Vinculada ao `auth.users` do Supabase. Email é sintético interno (`{cpf}@auth.topdiesel.local`); o login real é por CPF.

```sql
create table profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  cpf           text not null unique,            -- somente dígitos, validado na app
  full_name     text not null,
  role          user_role not null default 'driver',
  phone         text,
  email         text,                            -- opcional, para recuperação self-service
  photo_path    text,                            -- caminho no Storage
  is_active     boolean not null default true,
  must_change_password boolean not null default true,  -- força troca no 1º acesso
  terms_accepted_at timestamptz,                 -- aceite do termo de uso
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  created_by    uuid references profiles(id)
);

create index on profiles (role) where is_active;
```

### 3.2 `driver_profiles` — dados específicos de motorista

Separado de `profiles` porque só motoristas têm. Relação 1:1 opcional.

```sql
create table driver_profiles (
  profile_id     uuid primary key references profiles(id) on delete cascade,
  cnh_category   text,             -- ex.: 'E'
  birth_date     date,
  hired_at       date,             -- data de admissão
  dismissed_at   date,             -- data de desligamento (soft)
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
```

### 3.3 `companies` — empresas proprietárias (etiqueta)

```sql
create table companies (
  id          uuid primary key default gen_random_uuid(),
  kind        company_kind not null unique,
  legal_name  text not null,      -- razão social
  cnpj        text,
  address     text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
-- Seed: TOP DIESEL e Auto Posto Planeta.
```

### 3.4 `vehicles` — frota

```sql
create table vehicles (
  id           uuid primary key default gen_random_uuid(),
  plate        text not null unique,        -- placa, ex.: 'MJE-8F98'
  company_id   uuid not null references companies(id),  -- só etiqueta/filtro
  model        text,                        -- ex.: 'Volvo FH 460'
  year         int,
  vehicle_type vehicle_type not null,
  capacity     text,                        -- ex.: '30000 L' / livre
  status       vehicle_status not null default 'ativo',
  photo_path   text,
  notes        text,
  deleted_at   timestamptz,                 -- soft delete
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  created_by   uuid references profiles(id)
);

create index on vehicles (company_id) where deleted_at is null;
create index on vehicles (status)     where deleted_at is null;
```

### 3.5 `vehicle_assignments` — qual motorista está em qual veículo

Histórico preservado. O vínculo "atual" é a linha com `unassigned_at is null`.

```sql
create table vehicle_assignments (
  id            uuid primary key default gen_random_uuid(),
  vehicle_id    uuid not null references vehicles(id),
  driver_id     uuid not null references profiles(id),
  assigned_at   timestamptz not null default now(),
  unassigned_at timestamptz,                -- null = atribuição vigente
  created_by    uuid references profiles(id)
);

-- Garante no máximo 1 atribuição vigente por veículo
create unique index uniq_active_assignment_per_vehicle
  on vehicle_assignments (vehicle_id) where unassigned_at is null;

-- Garante no máximo 1 veículo vigente por motorista
create unique index uniq_active_assignment_per_driver
  on vehicle_assignments (driver_id) where unassigned_at is null;
```

### 3.6 `vehicle_documents` — documentos do veículo com vencimento

```sql
create table vehicle_documents (
  id           uuid primary key default gen_random_uuid(),
  vehicle_id   uuid not null references vehicles(id),
  doc_type     vehicle_doc_type not null,
  doc_number   text,
  issued_at    date,
  expires_at   date,                        -- base dos alertas
  file_path    text,                        -- PDF no Storage
  notes        text,
  deleted_at   timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  created_by   uuid references profiles(id)
);

create index on vehicle_documents (vehicle_id) where deleted_at is null;
create index on vehicle_documents (expires_at) where deleted_at is null;
```

### 3.7 `driver_documents` — documentos pessoais do motorista

```sql
create table driver_documents (
  id           uuid primary key default gen_random_uuid(),
  driver_id    uuid not null references profiles(id),
  doc_type     driver_doc_type not null,
  doc_number   text,
  issued_at    date,
  expires_at   date,
  file_path    text,
  notes        text,
  deleted_at   timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  created_by   uuid references profiles(id)
);

create index on driver_documents (driver_id)  where deleted_at is null;
create index on driver_documents (expires_at) where deleted_at is null;
```

### 3.8 `company_documents` — documentos institucionais/prediais

```sql
create table company_documents (
  id           uuid primary key default gen_random_uuid(),
  company_id   uuid not null references companies(id),
  doc_type     company_doc_type not null,
  doc_number   text,
  issued_at    date,
  expires_at   date,
  file_path    text,
  notes        text,
  deleted_at   timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  created_by   uuid references profiles(id)
);

create index on company_documents (expires_at) where deleted_at is null;
```

### 3.9 `audit_logs` — registro de ações sensíveis

```sql
create table audit_logs (
  id          bigint generated always as identity primary key,
  actor_id    uuid references profiles(id),    -- quem fez
  action      text not null,                   -- ex.: 'role_change', 'password_reset', 'soft_delete', 'doc_edit'
  entity      text not null,                   -- ex.: 'vehicle', 'driver_document'
  entity_id   text,                            -- id do alvo
  detail      jsonb,                           -- antes/depois quando útil (CPF mascarado)
  created_at  timestamptz not null default now()
);

create index on audit_logs (entity, entity_id);
create index on audit_logs (actor_id, created_at);
```

---

## 4. Status de vencimento — função e view

Status nunca é gravado. É derivado a partir de `expires_at`.

```sql
-- Retorna o nível de alerta a partir de uma data de validade
create or replace function expiry_status(expires date)
returns text language sql immutable as $$
  select case
    when expires is null then 'sem_data'
    when expires <  current_date then 'vencido'
    when expires <= current_date + 7  then 'critico'   -- D-7 vermelho
    when expires <= current_date + 15 then 'alerta'    -- D-15 laranja
    when expires <= current_date + 30 then 'atencao'   -- D-30 amarelo
    else 'em_dia'                                       -- verde
  end;
$$;
```

```sql
-- View unificada de todos os vencimentos (veículo + motorista + empresa)
-- Alimenta a faixa de alertas do Painel e a página Frota/Documentos.
create view v_expiry_alerts as
  select 'vehicle'  as scope, vd.id, vd.doc_type::text as doc_type,
         v.plate as ref_label, vd.expires_at,
         expiry_status(vd.expires_at) as status, vd.vehicle_id as ref_id
    from vehicle_documents vd
    join vehicles v on v.id = vd.vehicle_id
   where vd.deleted_at is null and v.deleted_at is null
  union all
  select 'driver', dd.id, dd.doc_type::text,
         p.full_name, dd.expires_at,
         expiry_status(dd.expires_at), dd.driver_id
    from driver_documents dd
    join profiles p on p.id = dd.driver_id
   where dd.deleted_at is null
  union all
  select 'company', cd.id, cd.doc_type::text,
         c.legal_name, cd.expires_at,
         expiry_status(cd.expires_at), cd.company_id
    from company_documents cd
    join companies c on c.id = cd.company_id
   where cd.deleted_at is null;
```

> Se a performance pedir no futuro, `v_expiry_alerts` vira tabela materializada atualizada por Edge Function diária. Começa como view.

---

## 5. RLS — Row Level Security por cargo

### 5.1 Funções auxiliares

```sql
-- Cargo do usuário autenticado
create or replace function current_role_name()
returns user_role language sql stable as $$
  select role from profiles where id = auth.uid();
$$;

create or replace function is_staff()  -- admin ou manager
returns boolean language sql stable as $$
  select current_role_name() in ('admin','manager');
$$;

-- Veículo atualmente atribuído ao motorista autenticado
create or replace function my_current_vehicle()
returns uuid language sql stable as $$
  select vehicle_id from vehicle_assignments
   where driver_id = auth.uid() and unassigned_at is null
   limit 1;
$$;
```

### 5.2 Políticas (padrão por tabela)

```sql
alter table vehicles enable row level security;

-- Staff vê e gerencia tudo
create policy vehicles_staff_all on vehicles
  for all using (is_staff()) with check (is_staff());

-- Motorista vê apenas o veículo atribuído a ele (somente leitura)
create policy vehicles_driver_read on vehicles
  for select using (id = my_current_vehicle());
```

```sql
alter table vehicle_documents enable row level security;

create policy vdocs_staff_all on vehicle_documents
  for all using (is_staff()) with check (is_staff());

create policy vdocs_driver_read on vehicle_documents
  for select using (vehicle_id = my_current_vehicle());
```

```sql
alter table driver_documents enable row level security;

create policy ddocs_staff_all on driver_documents
  for all using (is_staff()) with check (is_staff());

-- Motorista vê só os próprios documentos
create policy ddocs_driver_read on driver_documents
  for select using (driver_id = auth.uid());
```

```sql
alter table profiles enable row level security;

create policy profiles_staff_all on profiles
  for all using (is_staff()) with check (is_staff());

-- Motorista lê só o próprio perfil
create policy profiles_self_read on profiles
  for select using (id = auth.uid());
```

> **Regra de teste cravada:** cada tabela acima exige um teste de integração que, autenticado como `driver`, confirma que ele NÃO acessa veículo/documento de outro. PR sem esse teste é rejeitado.

---

## 6. Storage (anexos)

- Bucket `documents` (privado) — PDFs de documentos de veículo, motorista, empresa.
- Bucket `photos` (privado) — fotos de veículos e perfis.
- Acesso via URLs assinadas geradas no servidor, respeitando o cargo. Motorista só recebe URL assinada de arquivo do próprio veículo / próprios documentos.

---

## 7. Tabelas de M2 (mapeadas, ainda não detalhadas)

| Tabela | Para quê | Notas de modelagem |
|---|---|---|
| `task_templates` | Modelos de checklist recorrente | frequência (diária/semanal/mensal/por_km), itens em jsonb |
| `task_instances` | Ocorrência diária do checklist | gerada por Edge Function; status; evidência (foto) |
| `incidents` | Ocorrências abertas por motorista | tipo (pneu/mecânico/documento/outro), foto, áudio, transcrição |
| `oil_changes` | Trocas de óleo | km_atual, km_proxima (derivada), data |
| `extinguishers` | Extintores | vínculo a veículo, vencimento |
| `tires` | Pneus marcados a fogo (estoque) | número de fogo único, status (estoque/alocado/baixado) |
| `tire_movements` | Alocação/realocação/baixa | pneu ↔ veículo ↔ posição (depende do `vehicle_type`) |
| `external_registrations` | Cadastros VIBRA/RAIZEN/BEST/IPIRANGA | última atualização, periodicidade, próximo vencimento |
| `mdf_records` | MDF pendentes | sistema origem (MultiCTE/BSoft), prazo de encerramento |

---

## 8. Tabelas de M3 (mapeadas)

| Tabela | Para quê | Notas |
|---|---|---|
| `maintenance_events` | Manutenção por placa | data, fornecedor, valor, NF anexada, km, plano de contas. **Motorista vê valor do próprio veículo.** |
| `fuel_records` | Abastecimentos | veículo, motorista, litros, valor, km, NF |
| `action_plans` | Resolução multi-etapa de incidente | etapas, responsável, prazo, evidência |
| `cost_per_km` (view) | Custo/km por veículo | agrega manutenção + abastecimento / km rodado |

---

## 9. Ordem de implementação na M1 (migrations)

1. enums → `companies` (seed) → `profiles` → `driver_profiles`
2. `vehicles` → `vehicle_assignments`
3. `vehicle_documents` → `driver_documents` → `company_documents`
4. `audit_logs`
5. `expiry_status()` + `v_expiry_alerts`
6. funções RLS + políticas (com testes de integração por cargo)
7. buckets de Storage + políticas

Cada passo é uma migration versionada no Supabase, com teste de RLS no mesmo PR quando a tabela tiver dado sensível.

---

## 10. Pendências de decisão (para o Miguel)

1. **CNH/MOPP do motorista** — esses documentos têm vencimento e o motorista vê os próprios (`driver_documents`). Confirma que motorista **não edita** (só lê), e que quem cadastra/renova é o Gabriel? *(modelado assim)*
2. **Semi-reboque/reboque** — eles têm CRLV próprio e documentos próprios, mas não têm motorista fixo. Modelados como `vehicles` com `vehicle_type='semi_reboque'`. OK, ou prefere tratá-los como "equipamento" à parte?
3. **Posições de pneu** (M2) dependem do tipo de veículo (Bitruck ≠ Toco ≠ Truck). Já vi os docx de alocação na pasta do gdrive — vou modelar a partir deles quando chegar a M2.
4. **`company_id` editável** — o veículo pode trocar de empresa proprietária ao longo do tempo? Se sim, vale histórico; se não, é campo simples. *(modelado como campo simples por enquanto)*
