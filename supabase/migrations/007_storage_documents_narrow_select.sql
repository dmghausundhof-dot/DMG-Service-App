-- Öffentliche URLs funktionieren über den Bucket-Flag "public" ohne diese Policy.
-- Breites SELECT erlaubte LIST aller Dateien und wird von Supabase als unnötig/exponierend gemeldet.

DROP POLICY IF EXISTS "documents_public_read_dmgservice" ON storage.objects;
