-- Härtung: Dokument-Kontext (appointment_id/asset_id) per RLS absichern
-- und Pipeline-Index für Admin-Listen ergänzen.

-- Performance für Admin-Terminpipeline
CREATE INDEX IF NOT EXISTS idx_appointments_status_preferred_date
  ON appointments(status, preferred_date);

-- Bestehende Insert-Policies ersetzen, damit neue Kontextfelder mitvalidiert werden.
DROP POLICY IF EXISTS "Customers upload files for own objects" ON documents;
DROP POLICY IF EXISTS "Admins upload business documents" ON documents;

CREATE POLICY "Customers upload files for own objects"
  ON documents FOR INSERT
  TO authenticated
  WITH CHECK (
    type = 'customer_upload'
    AND appointment_id IS NULL
    AND asset_id IS NULL
    AND object_id IN (
      SELECT o.id
      FROM objects o
      JOIN profiles p ON o.profile_id = p.id
      WHERE p.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins upload business documents"
  ON documents FOR INSERT
  TO authenticated
  WITH CHECK (
    type IN ('offer', 'invoice', 'report', 'other')
    AND EXISTS (
      SELECT 1
      FROM profiles
      WHERE profiles.user_id = auth.uid()
        AND profiles.role = 'admin'
    )
    AND EXISTS (SELECT 1 FROM objects WHERE objects.id = object_id)
    AND (
      appointment_id IS NULL OR EXISTS (
        SELECT 1
        FROM appointments
        WHERE appointments.id = documents.appointment_id
          AND appointments.object_id = documents.object_id
      )
    )
    AND (
      asset_id IS NULL OR EXISTS (
        SELECT 1
        FROM assets
        WHERE assets.id = documents.asset_id
          AND assets.object_id = documents.object_id
      )
    )
  );

-- Admins dürfen verknüpfte Kontextfelder nachträglich korrigieren.
CREATE POLICY "Admins update documents context"
  ON documents FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM profiles
      WHERE profiles.user_id = auth.uid()
        AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM profiles
      WHERE profiles.user_id = auth.uid()
        AND profiles.role = 'admin'
    )
    AND EXISTS (SELECT 1 FROM objects WHERE objects.id = object_id)
    AND (
      appointment_id IS NULL OR EXISTS (
        SELECT 1
        FROM appointments
        WHERE appointments.id = documents.appointment_id
          AND appointments.object_id = documents.object_id
      )
    )
    AND (
      asset_id IS NULL OR EXISTS (
        SELECT 1
        FROM assets
        WHERE assets.id = documents.asset_id
          AND assets.object_id = documents.object_id
      )
    )
  );
