-- Optionale Fotos zur Terminanfrage (öffentliche Storage-URLs + Metadaten).
ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS attachment_urls jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN appointments.attachment_urls IS
  'JSON-Array: [{ "url", "file_name", "file_size" }, ...] zu Fotos der Anfrage';
