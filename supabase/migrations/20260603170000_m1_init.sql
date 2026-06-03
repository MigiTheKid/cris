-- =====================================================================
-- CRIS · Migration M1 — schema inicial (frota, motoristas, documentos)
-- Espelha _docs/02-modelagem.md. Segurança por CARGO (RLS), sem multi-tenant.
-- =====================================================================

-- ---------- 1. ENUMS ----------
create type user_role as enum ('admin', 'manager', 'driver');
create type company_kind as enum ('top_diesel', 'posto_planeta');
create type vehicle_type as enum ('cavalo', 'truck', 'toco', 'bitruck', 'leve', 'semi_reboque', 'reboque');
create type vehicle_status as enum ('ativo', 'inativo', 'em_manutencao');

create type vehicle_doc_type as enum (
  'crlv', 'cipp', 'inmetro', 'tara', 'lac', 'modal_rodoviario', 'cert_regularidade', 'outro'
);
create type driver_doc_type as enum (
  'cnh', 'mopp', 'toxicologico', 'aso', 'outro'
);
create type company_doc_type as enum (
  'alvara', 'cert_regularidade', 'modal_rodoviario', 'licenca_ambiental', 'outro'
);

-- ---------- 2. TRIGGER updated_at ----------
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------- 3. EMPRESAS (só etiqueta) ----------
create table companies (
  id          uuid primary key default gen_random_uuid(),
  kind        company_kind not null unique,
  legal_name  text not null,
  cnpj        text,
  address     text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create trigger trg_companies_updated before update on companies
  for each row execute function set_updated_at();

insert into companies (kind, legal_name) values
  ('top_diesel',    'TOP DIESEL Comércio de Combustíveis LTDA'),
  ('posto_planeta', 'Auto Posto Planeta LTDA');

-- ---------- 4. PESSOAS ----------
create table profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  cpf           text not null unique,
  full_name     text not null,
  role          user_role not null default 'driver',
  phone         text,
  email         text,
  photo_path    text,
  is_active     boolean not null default true,
  must_change_password boolean not null default true,
  terms_accepted_at timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  created_by    uuid references profiles(id)
);
create index idx_profiles_role on profiles (role) where is_active;
create trigger trg_profiles_updated before update on profiles
  for each row execute function set_updated_at();

create table driver_profiles (
  profile_id     uuid primary key references profiles(id) on delete cascade,
  cnh_category   text,
  birth_date     date,
  hired_at       date,
  dismissed_at   date,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create trigger trg_driver_profiles_updated before update on driver_profiles
  for each row execute function set_updated_at();

-- ---------- 5. FROTA ----------
create table vehicles (
  id           uuid primary key default gen_random_uuid(),
  plate        text not null unique,
  company_id   uuid not null references companies(id),
  model        text,
  year         int,
  vehicle_type vehicle_type not null,
  capacity     text,
  status       vehicle_status not null default 'ativo',
  photo_path   text,
  notes        text,
  deleted_at   timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  created_by   uuid references profiles(id)
);
create index idx_vehicles_company on vehicles (company_id) where deleted_at is null;
create index idx_vehicles_status  on vehicles (status)     where deleted_at is null;
create trigger trg_vehicles_updated before update on vehicles
  for each row execute function set_updated_at();

create table vehicle_assignments (
  id            uuid primary key default gen_random_uuid(),
  vehicle_id    uuid not null references vehicles(id),
  driver_id     uuid not null references profiles(id),
  assigned_at   timestamptz not null default now(),
  unassigned_at timestamptz,
  created_by    uuid references profiles(id)
);
create unique index uniq_active_assignment_per_vehicle
  on vehicle_assignments (vehicle_id) where unassigned_at is null;
create unique index uniq_active_assignment_per_driver
  on vehicle_assignments (driver_id) where unassigned_at is null;

-- ---------- 6. DOCUMENTOS ----------
create table vehicle_documents (
  id           uuid primary key default gen_random_uuid(),
  vehicle_id   uuid not null references vehicles(id),
  doc_type     vehicle_doc_type not null,
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
create index idx_vdocs_vehicle on vehicle_documents (vehicle_id) where deleted_at is null;
create index idx_vdocs_expires on vehicle_documents (expires_at) where deleted_at is null;
create trigger trg_vdocs_updated before update on vehicle_documents
  for each row execute function set_updated_at();

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
create index idx_ddocs_driver  on driver_documents (driver_id)  where deleted_at is null;
create index idx_ddocs_expires on driver_documents (expires_at) where deleted_at is null;
create trigger trg_ddocs_updated before update on driver_documents
  for each row execute function set_updated_at();

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
create index idx_cdocs_expires on company_documents (expires_at) where deleted_at is null;
create trigger trg_cdocs_updated before update on company_documents
  for each row execute function set_updated_at();

-- ---------- 7. AUDITORIA ----------
create table audit_logs (
  id          bigint generated always as identity primary key,
  actor_id    uuid references profiles(id),
  action      text not null,
  entity      text not null,
  entity_id   text,
  detail      jsonb,
  created_at  timestamptz not null default now()
);
create index idx_audit_entity on audit_logs (entity, entity_id);
create index idx_audit_actor  on audit_logs (actor_id, created_at);

-- ---------- 8. STATUS DE VENCIMENTO (derivado) ----------
create or replace function expiry_status(expires date)
returns text language sql immutable as $$
  select case
    when expires is null then 'sem_data'
    when expires <  current_date then 'vencido'
    when expires <= current_date + 7  then 'critico'
    when expires <= current_date + 15 then 'alerta'
    when expires <= current_date + 30 then 'atencao'
    else 'em_dia'
  end;
$$;

create view v_expiry_alerts as
  select 'vehicle'::text as scope, vd.id, vd.doc_type::text as doc_type,
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

-- ---------- 9. RLS — funções auxiliares ----------
create or replace function current_role_name()
returns user_role language sql stable security definer set search_path = public as $$
  select role from profiles where id = auth.uid();
$$;

create or replace function is_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(current_role_name() in ('admin','manager'), false);
$$;

create or replace function my_current_vehicle()
returns uuid language sql stable security definer set search_path = public as $$
  select vehicle_id from vehicle_assignments
   where driver_id = auth.uid() and unassigned_at is null
   limit 1;
$$;

-- ---------- 10. RLS — políticas por cargo ----------
alter table companies            enable row level security;
alter table profiles             enable row level security;
alter table driver_profiles      enable row level security;
alter table vehicles             enable row level security;
alter table vehicle_assignments  enable row level security;
alter table vehicle_documents    enable row level security;
alter table driver_documents     enable row level security;
alter table company_documents    enable row level security;
alter table audit_logs           enable row level security;

-- companies: staff tudo; driver lê (etiqueta do veículo)
create policy companies_staff_all on companies for all using (is_staff()) with check (is_staff());
create policy companies_read on companies for select using (auth.uid() is not null);

-- profiles: staff tudo; cada um lê o próprio
create policy profiles_staff_all on profiles for all using (is_staff()) with check (is_staff());
create policy profiles_self_read on profiles for select using (id = auth.uid());

-- driver_profiles: staff tudo; motorista lê o próprio
create policy dprofiles_staff_all on driver_profiles for all using (is_staff()) with check (is_staff());
create policy dprofiles_self_read on driver_profiles for select using (profile_id = auth.uid());

-- vehicles: staff tudo; motorista lê só o atribuído
create policy vehicles_staff_all on vehicles for all using (is_staff()) with check (is_staff());
create policy vehicles_driver_read on vehicles for select using (id = my_current_vehicle());

-- vehicle_assignments: staff tudo; motorista lê as próprias
create policy vassign_staff_all on vehicle_assignments for all using (is_staff()) with check (is_staff());
create policy vassign_driver_read on vehicle_assignments for select using (driver_id = auth.uid());

-- vehicle_documents: staff tudo; motorista lê os do veículo atribuído
create policy vdocs_staff_all on vehicle_documents for all using (is_staff()) with check (is_staff());
create policy vdocs_driver_read on vehicle_documents for select using (vehicle_id = my_current_vehicle());

-- driver_documents: staff tudo; motorista lê os próprios
create policy ddocs_staff_all on driver_documents for all using (is_staff()) with check (is_staff());
create policy ddocs_driver_read on driver_documents for select using (driver_id = auth.uid());

-- company_documents: só staff
create policy cdocs_staff_all on company_documents for all using (is_staff()) with check (is_staff());

-- audit_logs: só staff lê; escrita via service role/trigger
create policy audit_staff_read on audit_logs for select using (is_staff());
