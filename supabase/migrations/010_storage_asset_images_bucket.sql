-- Fotos für Anlagen (KI-Erkennung). Öffentlicher Bucket für image_url/getPublicUrl; kein globales LIST (keine breite SELECT-Policy).

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'asset-images',
  'asset-images',
  true,
  15728640,
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif',
    'image/gif'
  ]::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types,
  name = excluded.name;

DROP POLICY IF EXISTS "asset_images_authenticated_upload_dmgservice" ON storage.objects;

CREATE POLICY "asset_images_authenticated_upload_dmgservice"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'asset-images');
