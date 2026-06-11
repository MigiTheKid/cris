-- =====================================================================
-- CRIS · Storage — bucket privado para FOTOS (veículo e motorista).
-- Colunas vehicles.photo_path / profiles.photo_path já existem (M1).
-- Imagens (jpeg/png/webp), até 5 MB. Acesso de escrita/leitura: staff.
-- =====================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'photos',
  'photos',
  false,
  5242880, -- 5 MB
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

-- Políticas no storage.objects, restritas ao bucket 'photos' (staff).
create policy photos_staff_select on storage.objects
  for select using (bucket_id = 'photos' and is_staff());
create policy photos_staff_insert on storage.objects
  for insert with check (bucket_id = 'photos' and is_staff());
create policy photos_staff_update on storage.objects
  for update using (bucket_id = 'photos' and is_staff());
create policy photos_staff_delete on storage.objects
  for delete using (bucket_id = 'photos' and is_staff());
