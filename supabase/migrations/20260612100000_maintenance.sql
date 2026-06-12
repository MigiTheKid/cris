-- =====================================================================
-- CRIS · M3 — Manutenções (ordens de serviço)
-- Modelo: OS → itens de serviço (do catálogo, que herda o SISTEMA do
-- veículo) → custos (peças × mão de obra). Taxonomia de 18 sistemas em
-- pt-BR adaptada do VMRS (padrão ATA/TMC) — o relatório de custo por
-- sistema sai automático, sem ninguém classificar nada na mão.
-- =====================================================================

-- ---------- 18 sistemas do veículo (VMRS simplificado) ----------
create table maintenance_systems (
  id         smallint primary key,
  name       text not null,
  vmrs_code  text,                       -- referência ao Code Key 31 do VMRS
  sort       smallint not null default 0,
  is_active  boolean not null default true
);
create unique index uniq_maint_system_name on maintenance_systems (lower(name));

insert into maintenance_systems (id, name, vmrs_code, sort) values
  ( 1, 'Motor',                    '045', 1),
  ( 2, 'Combustível',              '044', 2),
  ( 3, 'Admissão de ar',           '041', 3),
  ( 4, 'Arrefecimento',            '042', 4),
  ( 5, 'Escape / Arla',            '043', 5),
  ( 6, 'Transmissão / Embreagem',  '026', 6),
  ( 7, 'Diferencial / Cardan',     '022', 7),
  ( 8, 'Freios',                   '013', 8),
  ( 9, 'Suspensão',                '016', 9),
  (10, 'Direção',                  '015', 10),
  (11, 'Rodas / Cubos',            '018', 11),
  (12, 'Pneus',                    '017', 12),
  (13, 'Elétrica',                 '031', 13),
  (14, 'Cabine / Carroceria',      '002', 14),
  (15, 'Ar-condicionado',          '001', 15),
  (16, 'Chassi / Quinta roda',     '014', 16),
  (17, 'Tanque / Implemento',      '073', 17),
  (18, 'Geral / Lubrificação',     '053', 18);

-- ---------- Catálogo de serviços (cada serviço já carrega o sistema) ----------
create table service_catalog (
  id                   uuid primary key default gen_random_uuid(),
  name                 text not null,
  system_id            smallint not null references maintenance_systems(id),
  default_interval_km  integer,          -- sugestão de "próxima" para itens previsíveis
  is_active            boolean not null default true,
  created_by           uuid references profiles(id),
  created_at           timestamptz not null default now()
);
create unique index uniq_service_name on service_catalog (lower(name));

insert into service_catalog (name, system_id, default_interval_km) values
  -- Motor
  ('Revisão do motor', 1, null),
  ('Troca de correias do motor', 1, 100000),
  ('Troca de bicos injetores', 1, null),
  ('Reparo na turbina', 1, null),
  -- Combustível
  ('Troca do filtro separador de água', 2, null),
  ('Reparo na bomba de combustível', 2, null),
  -- Admissão de ar
  ('Troca do filtro de ar', 3, 50000),
  ('Troca de mangotes do intercooler', 3, null),
  -- Arrefecimento
  ('Troca do líquido de arrefecimento', 4, null),
  ('Troca da bomba d''água', 4, null),
  ('Reparo no radiador', 4, null),
  ('Troca da válvula termostática', 4, null),
  -- Escape / Arla
  ('Reparo no sistema de Arla 32', 5, null),
  ('Troca do filtro de Arla', 5, 100000),
  ('Reparo no escapamento', 5, null),
  -- Transmissão / Embreagem
  ('Troca do óleo da caixa', 6, 120000),
  ('Troca da embreagem (platô e disco)', 6, null),
  ('Reparo na caixa de mudanças', 6, null),
  -- Diferencial / Cardan
  ('Troca do óleo do diferencial', 7, 120000),
  ('Troca de cruzetas do cardan', 7, null),
  ('Reparo no diferencial', 7, null),
  -- Freios
  ('Troca de lonas de freio', 8, null),
  ('Troca de pastilhas de freio', 8, null),
  ('Troca de tambores / discos', 8, null),
  ('Regulagem de freios', 8, 30000),
  ('Troca do secador de ar (APU)', 8, 100000),
  ('Reparo no compressor de ar', 8, null),
  ('Troca de cuíca / câmara de freio', 8, null),
  -- Suspensão
  ('Troca de feixes de molas', 9, null),
  ('Troca de bolsas de ar', 9, null),
  ('Troca de amortecedores', 9, null),
  ('Troca de buchas e tirantes', 9, null),
  -- Direção
  ('Troca de terminais de direção', 10, null),
  ('Reparo na caixa de direção', 10, null),
  ('Alinhamento de direção', 10, 20000),
  -- Rodas / Cubos
  ('Troca de rolamento de cubo', 11, null),
  ('Troca de retentores de cubo', 11, null),
  -- Elétrica
  ('Troca de baterias', 13, null),
  ('Reparo no alternador', 13, null),
  ('Reparo no motor de partida', 13, null),
  ('Reparo na iluminação / chicote', 13, null),
  -- Cabine / Carroceria
  ('Troca de para-brisa', 14, null),
  ('Reparo na cabine / lataria', 14, null),
  ('Troca de retrovisores', 14, null),
  -- Ar-condicionado
  ('Carga de gás do ar-condicionado', 15, null),
  ('Reparo no compressor do ar-condicionado', 15, null),
  -- Chassi / Quinta roda
  ('Reparo na quinta roda', 16, null),
  ('Solda / reparo no chassi', 16, null),
  -- Tanque / Implemento
  ('Reparo em válvulas do tanque', 17, null),
  ('Teste / aferição do tanque', 17, null),
  ('Reparo na bomba de descarga', 17, null),
  ('Reparo em mangotes do implemento', 17, null),
  -- Geral / Lubrificação
  ('Lubrificação geral (chassi)', 18, 20000),
  ('Lavagem e higienização', 18, null),
  ('Revisão geral / check-up', 18, null);

-- ---------- Ordem de serviço (registro direto: lançada já concluída) ----------
create table work_orders (
  id           uuid primary key default gen_random_uuid(),
  vehicle_id   uuid not null references vehicles(id) on delete cascade,
  performed_at date,                              -- data do serviço (opcional)
  odometer_km  integer not null,                  -- km na entrada da oficina
  reason       text not null default 'corretiva'
               check (reason in ('preventiva', 'corretiva', 'socorro', 'acidente', 'garantia')),
  vendor_id    uuid references vendors(id),
  os_ref       text,                              -- nº da OS / nota da oficina
  cost         numeric(12,2),                     -- total denormalizado (soma dos custos)
  notes        text,
  created_by   uuid references profiles(id),
  created_at   timestamptz not null default now()
);
create index idx_work_orders_vehicle on work_orders (vehicle_id, odometer_km desc);

-- Item da OS: um serviço executado. Herda o sistema do catálogo (ou manual).
create table work_order_items (
  id             uuid primary key default gen_random_uuid(),
  work_order_id  uuid not null references work_orders(id) on delete cascade,
  service_id     uuid references service_catalog(id),
  label          text not null,                   -- nome do serviço (snapshot)
  system_id      smallint not null references maintenance_systems(id),
  description    text,                            -- componente/detalhe livre
  next_km        integer                          -- próxima intervenção prevista (alerta)
);
create index idx_wo_items_order on work_order_items (work_order_id);

-- Custos do item: peças (qtd × valor) e mão de obra.
create table work_order_costs (
  id        uuid primary key default gen_random_uuid(),
  item_id   uuid not null references work_order_items(id) on delete cascade,
  category  text not null check (category in ('peca', 'mao_de_obra')),
  label     text not null,
  quantity  numeric(12,3),
  unit      text,                                 -- un | jg | par | L | kg | h
  cost      numeric(12,2) not null default 0
);
create index idx_wo_costs_item on work_order_costs (item_id);

-- ---------- RLS ----------
alter table maintenance_systems enable row level security;
create policy maint_systems_read on maintenance_systems
  for select using (auth.uid() is not null);
create policy maint_systems_staff_write on maintenance_systems
  for all using (is_staff()) with check (is_staff());

alter table service_catalog enable row level security;
create policy service_catalog_read on service_catalog
  for select using (auth.uid() is not null);
create policy service_catalog_staff_write on service_catalog
  for all using (is_staff()) with check (is_staff());

alter table work_orders enable row level security;
create policy work_orders_staff_all on work_orders
  for all using (is_staff()) with check (is_staff());
create policy work_orders_driver_read on work_orders
  for select using (vehicle_id = my_current_vehicle());

alter table work_order_items enable row level security;
create policy wo_items_staff_all on work_order_items
  for all using (is_staff()) with check (is_staff());
create policy wo_items_driver_read on work_order_items
  for select using (
    work_order_id in (select id from work_orders where vehicle_id = my_current_vehicle())
  );

alter table work_order_costs enable row level security;
create policy wo_costs_staff_all on work_order_costs
  for all using (is_staff()) with check (is_staff());
create policy wo_costs_driver_read on work_order_costs
  for select using (
    item_id in (
      select i.id from work_order_items i
      join work_orders o on o.id = i.work_order_id
      where o.vehicle_id = my_current_vehicle()
    )
  );
