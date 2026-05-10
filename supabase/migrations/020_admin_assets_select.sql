-- Admins können Anlagen lesen (verknüpfte assets in Termin-Detail / Admin-Liste)
CREATE POLICY "Admins can view all assets"
  ON assets FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
        AND profiles.role = 'admin'
    )
  );
