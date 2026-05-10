-- Bucket "documents" (entspricht supabase.storage.from('documents') in der App).
-- Öffentlicher Lesezugriff für URLs aus getPublicUrl; Upload nur für eingeloggte Nutzer.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  true,
  10485760,
  ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/heic',
    'image/heif'
  ]::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types,
  name = excluded.name;

DROP POLICY IF EXISTS "documents_public_read_dmgservice" ON storage.objects;
DROP POLICY IF EXISTS "documents_authenticated_upload_dmgservice" ON storage.objects;

CREATE POLICY "documents_public_read_dmgservice"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'documents');

CREATE POLICY "documents_authenticated_upload_dmgservice"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'documents');
