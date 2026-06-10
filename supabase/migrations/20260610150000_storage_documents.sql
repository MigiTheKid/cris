-- =====================================================================
-- CRIS · Storage — bucket privado para PDFs de documentos
-- Acesso: staff (admin/manager) gerencia; leitura sempre via URL assinada
-- gerada no servidor (route handler valida a sessão antes).
-- =====================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'documents',
  'documents',
  false,
  10485760, -- 10 MB
  array['application/pdf']
)
on conflict (id) do nothing;

-- Políticas no storage.objects, restritas ao bucket 'documents'.
-- is_staff() já existe (migration M1) e é security definer.

create policy documents_staff_select on storage.objects
  for select using (bucket_id = 'documents' and is_staff());

create policy documents_staff_insert on storage.objects
  for insert with check (bucket_id = 'documents' and is_staff());

create policy documents_staff_update on storage.objects
  for update using (bucket_id = 'documents' and is_staff());

create policy documents_staff_delete on storage.objects
  for delete using (bucket_id = 'documents' and is_staff());
