-- =====================================================================
-- CRIS · M2 — Trocas de óleo (controle preventivo por km)
-- Vocês controlam por km: km da troca → próxima troca. Data é opcional.
-- A "próxima troca" é guardada direto (não derivada de intervalo fixo),
-- porque varia por veículo e há casos de plano fixo (BEST Mercedes).
-- =====================================================================

-- Campo informativo de plano de manutenção do veículo (ex.: Plano BEST Mercedes).
alter table vehicles add column if not exists maintenance_plan text;

create table oil_changes (
  id             uuid primary key default gen_random_uuid(),
  vehicle_id     uuid not null references vehicles(id) on delete cascade,
  changed_at     date,                              -- data da troca (opcional)
  odometer_km    integer not null,                  -- km no momento da troca
  next_km        integer,                           -- km da próxima troca (alvo)
  oil_spec       text,                              -- ex.: 15W40
  filter_changed boolean not null default false,    -- trocou o filtro?
  vendor         text,                              -- oficina
  cost           numeric(12,2),
  notes          text,
  created_by     uuid references profiles(id),
  created_at     timestamptz not null default now()
);

create index idx_oil_changes_vehicle on oil_changes (vehicle_id, odometer_km desc);

-- ---------- RLS: equipe gerencia; motorista lê só do próprio veículo ----------
alter table oil_changes enable row level security;

create policy oil_changes_staff_all on oil_changes
  for all using (is_staff()) with check (is_staff());

create policy oil_changes_driver_read on oil_changes
  for select using (vehicle_id = my_current_vehicle());
