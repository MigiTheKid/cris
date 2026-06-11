-- =====================================================================
-- CRIS · M2 PNEUS — Fase 1
-- O pneu é um patrimônio que viaja: identidade = nº de fogo, vida em
-- vínculos temporais (instalação), saúde em aferições, custo em eventos.
-- Mesmo padrão temporal de vehicle_assignments / vehicle_couplings.
-- =====================================================================

-- ---------- enums ----------
create type tire_status as enum ('em_uso', 'estoque', 'recapagem', 'conserto', 'sucateado', 'vendido');
create type axle_kind as enum ('direcional', 'tracao', 'truck', 'arrastado', 'reboque', 'outro');
create type tire_event_type as enum ('recapagem', 'conserto', 'sucateamento', 'venda');

-- ---------- pneus ----------
create table tires (
  id              uuid primary key default gen_random_uuid(),
  fire_number     text not null unique,          -- nº de fogo (identidade física)
  brand           text,
  model           text,
  size            text not null,                 -- ex.: 295/80 R22.5
  current_life    smallint not null default 1,   -- 1 = nova; recapagem incrementa
  tread_new_mm    numeric(4,1),                  -- sulco no início da vida atual
  status          tire_status not null default 'estoque',
  purchase_date   date,
  purchase_value  numeric(10,2),
  notes           text,
  created_by      uuid references profiles(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  deleted_at      timestamptz
);
create trigger trg_tires_updated before update on tires
  for each row execute function set_updated_at();

-- ---------- layout de eixos por veículo ----------
create table vehicle_axles (
  id           uuid primary key default gen_random_uuid(),
  vehicle_id   uuid not null references vehicles(id) on delete cascade,
  axle_number  smallint not null,                -- 1 = mais à frente
  kind         axle_kind not null,
  dual         boolean not null default false,   -- rodado duplo?
  unique (vehicle_id, axle_number)
);

-- ---------- instalações (vínculo temporal pneu × veículo × posição) ----------
create table tire_installations (
  id           uuid primary key default gen_random_uuid(),
  tire_id      uuid not null references tires(id),
  vehicle_id   uuid not null references vehicles(id),
  axle_number  smallint not null,
  side         text not null check (side in ('E', 'D')),          -- esquerdo/direito
  dual_pos     text check (dual_pos in ('I', 'E')),               -- interno/externo (null = simples)
  installed_at timestamptz not null default now(),
  installed_km integer,                                           -- hodômetro do veículo
  removed_at   timestamptz,
  removed_km   integer,
  created_by   uuid references profiles(id)
);
-- Um pneu só pode estar instalado em um lugar…
create unique index uniq_active_install_per_tire
  on tire_installations (tire_id) where removed_at is null;
-- …e uma posição só comporta um pneu (coalesce: NULLs não são distintos no índice).
create unique index uniq_active_install_per_position
  on tire_installations (vehicle_id, axle_number, side, coalesce(dual_pos, 'U'))
  where removed_at is null;
create index idx_installs_tire on tire_installations (tire_id, installed_at desc);
create index idx_installs_vehicle on tire_installations (vehicle_id) where removed_at is null;

-- ---------- aferições (sulco / pressão) ----------
create table tire_readings (
  id           uuid primary key default gen_random_uuid(),
  tire_id      uuid not null references tires(id),
  measured_at  date not null default current_date,
  tread_mm     numeric(4,1) not null,
  pressure_psi smallint,
  vehicle_km   integer,
  created_by   uuid references profiles(id),
  created_at   timestamptz not null default now()
);
create index idx_readings_tire on tire_readings (tire_id, measured_at desc);

-- ---------- eventos de vida (recapagem / conserto / sucata / venda) ----------
create table tire_events (
  id            uuid primary key default gen_random_uuid(),
  tire_id       uuid not null references tires(id),
  event_type    tire_event_type not null,
  event_date    date not null default current_date,
  cost          numeric(10,2),
  vendor        text,                              -- recapadora / borracharia
  new_tread_mm  numeric(4,1),                      -- sulco pós-recapagem
  notes         text,
  created_by    uuid references profiles(id),
  created_at    timestamptz not null default now()
);
create index idx_events_tire on tire_events (tire_id, event_date desc);

-- ---------- RLS ----------
alter table tires enable row level security;
alter table vehicle_axles enable row level security;
alter table tire_installations enable row level security;
alter table tire_readings enable row level security;
alter table tire_events enable row level security;

create policy tires_staff_all on tires for all using (is_staff()) with check (is_staff());
create policy axles_staff_all on vehicle_axles for all using (is_staff()) with check (is_staff());
create policy installs_staff_all on tire_installations for all using (is_staff()) with check (is_staff());
create policy readings_staff_all on tire_readings for all using (is_staff()) with check (is_staff());
create policy tevents_staff_all on tire_events for all using (is_staff()) with check (is_staff());

-- Motorista lê o rodado do veículo atribuído a ele.
create policy axles_driver_read on vehicle_axles
  for select using (vehicle_id = my_current_vehicle());
create policy installs_driver_read on tire_installations
  for select using (vehicle_id = my_current_vehicle());
create policy tires_driver_read on tires
  for select using (id in (
    select tire_id from tire_installations
     where vehicle_id = my_current_vehicle() and removed_at is null
  ));
create policy readings_driver_read on tire_readings
  for select using (tire_id in (
    select tire_id from tire_installations
     where vehicle_id = my_current_vehicle() and removed_at is null
  ));
