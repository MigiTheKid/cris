-- =====================================================================
-- CRIS · M2 — Oficinas (fornecedores de troca de óleo / manutenção)
-- Catálogo gerenciável: substitui o texto livre de "oficina" por seleção,
-- evitando divergência e alimentando o KPI "custo por oficina".
-- =====================================================================

create table vendors (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  kind        text not null default 'ambos' check (kind in ('troca_oleo', 'manutencao', 'ambos')),
  phone       text,
  city        text,
  notes       text,
  is_active   boolean not null default true,
  created_by  uuid references profiles(id),
  created_at  timestamptz not null default now()
);
create unique index uniq_vendor_name on vendors (lower(name));

-- Vínculo da troca de óleo com a oficina (o texto livre antigo fica como legado).
alter table oil_changes add column vendor_id uuid references vendors(id);

-- ---------- RLS: todos leem; equipe gerencia ----------
alter table vendors enable row level security;

create policy vendors_read on vendors
  for select using (auth.uid() is not null);
create policy vendors_staff_insert on vendors
  for insert with check (is_staff());
create policy vendors_staff_update on vendors
  for update using (is_staff()) with check (is_staff());
create policy vendors_staff_delete on vendors
  for delete using (is_staff());
