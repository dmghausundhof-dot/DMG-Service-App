-- Zusätzlicher Admin-Dokumententyp (z. B. Protokolle, Schriftverkehr).
ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_type_check;

ALTER TABLE documents ADD CONSTRAINT documents_type_check
  CHECK (type IN ('offer', 'invoice', 'report', 'customer_upload', 'other'));

DROP POLICY IF EXISTS "Admins upload business documents" ON documents;

CREATE POLICY "Admins upload business documents"
  ON documents FOR INSERT
  TO authenticated
  WITH CHECK (
    type IN ('offer', 'invoice', 'report', 'other')
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
        AND profiles.role = 'admin'
    )
    AND EXISTS (SELECT 1 FROM objects WHERE objects.id = object_id)
  );

COMMENT ON COLUMN documents.type IS
  'offer, invoice, report, other: nur Admin. customer_upload: Kunde.';
