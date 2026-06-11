-- =====================================================================
-- CRIS · Engate cavalo ⇄ reboque (composição).
-- Espelha o padrão de vehicle_assignments: vínculo temporal com histórico.
-- Regra de domínio (TOP DIESEL): SÓ cavalo engata; engata semi_reboque/reboque.
-- O motorista segue atribuído ao cavalo; o conjunto é derivado dos dois vínculos.
-- =====================================================================

create table vehicle_couplings (
  id            uuid primary key default gen_random_uuid(),
  tractor_id    uuid not null references vehicles(id),
  trailer_id    uuid not null references vehicles(id),
  coupled_at    timestamptz not null default now(),
  uncoupled_at  timestamptz,
  created_by    uuid references profiles(id),
  constraint coupling_not_self check (tractor_id <> trailer_id)
);

-- Um reboque ativo por cavalo e um cavalo ativo por reboque.
create unique index uniq_active_coupling_per_tractor
  on vehicle_couplings (tractor_id) where uncoupled_at is null;
create unique index uniq_active_coupling_per_trailer
  on vehicle_couplings (trailer_id) where uncoupled_at is null;

create index idx_couplings_tractor on vehicle_couplings (tractor_id, coupled_at desc);
create index idx_couplings_trailer on vehicle_couplings (trailer_id, coupled_at desc);

-- Valida os tipos no banco (não só na UI): cavalo puxa, rebocado é puxado.
create or replace function check_coupling_types()
returns trigger language plpgsql as $$
declare
  t_tractor vehicle_type;
  t_trailer vehicle_type;
begin
  select vehicle_type into t_tractor from vehicles where id = new.tractor_id;
  select vehicle_type into t_trailer from vehicles where id = new.trailer_id;
  if t_tractor <> 'cavalo' then
    raise exception 'Só cavalo mecânico pode engatar (recebido: %)', t_tractor;
  end if;
  if t_trailer not in ('semi_reboque', 'reboque') then
    raise exception 'Só semirreboque/reboque pode ser engatado (recebido: %)', t_trailer;
  end if;
  return new;
end;
$$;

create trigger trg_coupling_types before insert or update of tractor_id, trailer_id
  on vehicle_couplings for each row execute function check_coupling_types();

-- RLS: staff tudo; motorista lê o engate do veículo atribuído a ele.
alter table vehicle_couplings enable row level security;
create policy couplings_staff_all on vehicle_couplings
  for all using (is_staff()) with check (is_staff());
create policy couplings_driver_read on vehicle_couplings
  for select using (tractor_id = my_current_vehicle());
