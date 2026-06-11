-- =====================================================================
-- CRIS · Parâmetros do sistema (app_settings).
-- Chave/valor jsonb — começa pelos limiares de sulco dos pneus.
-- Leitura: qualquer autenticado (o app do motorista também precisará).
-- Escrita: só admin (parâmetro é política da operação).
-- =====================================================================

create table app_settings (
  key         text primary key,
  value       jsonb not null,
  updated_at  timestamptz not null default now(),
  updated_by  uuid references profiles(id)
);
create trigger trg_app_settings_updated before update on app_settings
  for each row execute function set_updated_at();

-- Limiar padrão: verde ≥ 5 mm · âmbar 3–5 (janela de recape) · vermelho < 3.
insert into app_settings (key, value)
values ('tire_thresholds', '{"ok_mm": 5, "recap_mm": 3}');

alter table app_settings enable row level security;
create policy settings_read on app_settings
  for select using (auth.uid() is not null);
create policy settings_admin_write on app_settings
  for all using (current_role_name() = 'admin')
  with check (current_role_name() = 'admin');
