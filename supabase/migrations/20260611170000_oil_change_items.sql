-- =====================================================================
-- CRIS · M2 — Trocas de óleo: custos itemizados (insumos × mão de obra)
-- Cada custo vira uma linha (categoria + nome + valor). O total é a soma;
-- os KPIs trabalham com os custos individuais (por insumo / categoria).
-- =====================================================================

create table oil_change_items (
  id             uuid primary key default gen_random_uuid(),
  oil_change_id  uuid not null references oil_changes(id) on delete cascade,
  category       text not null check (category in ('insumo', 'mao_de_obra')),
  label          text not null,
  quantity       numeric(12,3),                 -- quanto foi usado (ex.: 15 L)
  unit           text,                          -- un | L | kg | h
  cost           numeric(12,2) not null default 0  -- custo total da linha
);

create index idx_oil_items_change on oil_change_items (oil_change_id);

alter table oil_change_items enable row level security;

create policy oil_items_staff_all on oil_change_items
  for all using (is_staff()) with check (is_staff());

create policy oil_items_driver_read on oil_change_items
  for select using (
    oil_change_id in (select id from oil_changes where vehicle_id = my_current_vehicle())
  );
