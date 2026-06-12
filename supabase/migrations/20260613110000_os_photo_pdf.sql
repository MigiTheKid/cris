-- =====================================================================
-- CRIS · M3 IA — OS por foto: aceitar também PDF
-- As notas reais das oficinas chegam em PDF (DANFE etc.), não só foto.
-- =====================================================================

update storage.buckets
set allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
where id = 'os-photos';
