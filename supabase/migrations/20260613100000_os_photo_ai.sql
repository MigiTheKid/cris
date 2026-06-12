-- =====================================================================
-- CRIS · M3 IA — OS por foto
-- Guarda a foto original da OS (auditoria) e marca lançamentos feitos
-- com extração por IA, com o grau de confiança da leitura.
-- =====================================================================

alter table work_orders add column if not exists photo_path text;
alter table work_orders add column if not exists ai_extracted boolean not null default false;
alter table work_orders add column if not exists ai_confidence numeric(3,2);

-- Bucket privado para as fotos das OSs (imagens, 10 MB).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'os-photos',
  'os-photos',
  false,
  10485760, -- 10 MB
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

create policy os_photos_staff_select on storage.objects
  for select using (bucket_id = 'os-photos' and is_staff());

create policy os_photos_staff_insert on storage.objects
  for insert with check (bucket_id = 'os-photos' and is_staff());

create policy os_photos_staff_update on storage.objects
  for update using (bucket_id = 'os-photos' and is_staff());

create policy os_photos_staff_delete on storage.objects
  for delete using (bucket_id = 'os-photos' and is_staff());
