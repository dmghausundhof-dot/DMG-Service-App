-- Admins können Kundenprofile für Support (z. B. Termin-Detail) lesen.

CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles viewer
      WHERE viewer.user_id = auth.uid()
        AND viewer.role = 'admin'
    )
  );
