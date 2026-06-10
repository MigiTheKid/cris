-- =====================================================================
-- CRIS · Catálogo de tipos de documento (gerenciável pelo admin)
-- Substitui o enum fixo vehicle_doc_type por uma tabela de catálogo.
-- Escopo 'driver'/'company' já previsto (telas futuras usam o mesmo catálogo).
-- =====================================================================

create table document_types (
  key         text primary key,                -- identificador estável (ex.: 'crlv')
  scope       text not null default 'vehicle'
              check (scope in ('vehicle', 'driver', 'company')),
  label       text not null,                   -- nome exibido (ex.: 'CRLV')
  description text,                            -- descrição curta exibida no card
  is_active   boolean not null default true,   -- inativo some do dropdown (histórico preservado)
  sort        int not null default 100,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create trigger trg_document_types_updated before update on document_types
  for each row execute function set_updated_at();

-- Seed: tipos de documento de veículo atuais (mesmos labels do app).
insert into document_types (key, scope, label, description, sort) values
  ('crlv',              'vehicle', 'CRLV',                   'Certificado de Registro e Licenciamento', 10),
  ('cipp',              'vehicle', 'CIPP',                   'Certificado de Inspeção p/ Produtos Perigosos', 20),
  ('inmetro',           'vehicle', 'INMETRO',                'Inspeção INMETRO do tanque', 30),
  ('tara',              'vehicle', 'TARA',                   'Certificado de Tara', 40),
  ('lac',               'vehicle', 'LAC',                    'Licença Ambiental', 50),
  ('modal_rodoviario',  'vehicle', 'Modal Rodoviário',       'Autorização Modal Rodoviário (ANTT)', 60),
  ('cert_regularidade', 'vehicle', 'Cert. de Regularidade',  'Certificado de Regularidade', 70),
  ('outro',             'vehicle', 'Outro',                  'Outro documento', 999);

-- Converte a coluna enum → texto com FK pro catálogo (sem perda de dados).
-- A view de alertas depende da coluna: derruba antes e recria depois.
drop view v_expiry_alerts;

alter table vehicle_documents
  alter column doc_type type text using doc_type::text;
alter table vehicle_documents
  add constraint vehicle_documents_doc_type_fkey
  foreign key (doc_type) references document_types(key);

create view v_expiry_alerts as
  select 'vehicle'::text as scope, vd.id, vd.doc_type as doc_type,
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

-- O enum antigo deixa de ser usado pela tabela; mantido por compatibilidade
-- (nenhum outro objeto depende dele). Pode ser dropado em migration futura.

-- ---------- RLS ----------
alter table document_types enable row level security;

-- Qualquer usuário autenticado lê (dropdowns); só staff gerencia.
create policy doc_types_read on document_types
  for select using (auth.uid() is not null);
create policy doc_types_staff_write on document_types
  for insert with check (is_staff());
create policy doc_types_staff_update on document_types
  for update using (is_staff()) with check (is_staff());
