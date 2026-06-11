-- =====================================================================
-- CRIS · Tipos de documento do MOTORISTA no catálogo + driver_documents
-- usa o catálogo (mesmo padrão dos veículos).
-- =====================================================================

insert into document_types (key, scope, label, description, sort) values
  ('cnh',          'driver', 'CNH',           'Carteira Nacional de Habilitação', 10),
  ('mopp',         'driver', 'MOPP',          'Movimentação de Produtos Perigosos', 20),
  ('toxicologico', 'driver', 'Toxicológico',  'Exame Toxicológico', 30),
  ('aso',          'driver', 'ASO',           'Atestado de Saúde Ocupacional', 40),
  ('outro_driver', 'driver', 'Outro',         'Outro documento do motorista', 999);

-- Converte driver_documents.doc_type (enum) → text com FK pro catálogo.
-- A view de alertas depende da coluna: derruba antes e recria depois.
drop view v_expiry_alerts;

alter table driver_documents
  alter column doc_type type text using doc_type::text;
alter table driver_documents
  add constraint driver_documents_doc_type_fkey
  foreign key (doc_type) references document_types(key);

create view v_expiry_alerts as
  select 'vehicle'::text as scope, vd.id, vd.doc_type as doc_type,
         v.plate as ref_label, vd.expires_at,
         expiry_status(vd.expires_at) as status, vd.vehicle_id as ref_id
    from vehicle_documents vd
    join vehicles v on v.id = vd.vehicle_id
   where vd.deleted_at is null and v.deleted_at is null
  union all
  select 'driver', dd.id, dd.doc_type,
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
