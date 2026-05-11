-- Dokumente optional mit Termin und Anlage verknüpfen
ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS appointment_id uuid REFERENCES appointments(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS asset_id uuid REFERENCES assets(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_documents_appointment_id
  ON documents(appointment_id)
  WHERE appointment_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_documents_asset_id
  ON documents(asset_id)
  WHERE asset_id IS NOT NULL;

COMMENT ON COLUMN documents.appointment_id IS
  'Optional: Bezug auf konkrete Terminanfrage/Serviceeinsatz.';

COMMENT ON COLUMN documents.asset_id IS
  'Optional: Bezug auf konkrete Anlage.';
