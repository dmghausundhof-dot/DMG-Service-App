-- Kunden dürfen nur type = customer_upload für eigene Objekte anlegen.
-- Admins dürfen Rechnungen (invoice), Angebote (offer) und Serviceberichte (report)
-- für beliebige Objekte einfügen.

alter table documents drop constraint if exists documents_type_check;

alter table documents add constraint documents_type_check
  check (type in ('offer', 'invoice', 'report', 'customer_upload'));

drop policy if exists "Users can insert documents for their objects" on documents;

create policy "Customers upload files for own objects"
  on documents for insert
  to authenticated
  with check (
    type = 'customer_upload'
    and object_id in (
      select o.id from objects o
      join profiles p on o.profile_id = p.id
      where p.user_id = auth.uid()
    )
  );

create policy "Admins upload business documents"
  on documents for insert
  to authenticated
  with check (
    type in ('offer', 'invoice', 'report')
    and exists (
      select 1 from profiles
      where profiles.user_id = auth.uid()
        and profiles.role = 'admin'
    )
    and exists (select 1 from objects where objects.id = object_id)
  );

COMMENT ON COLUMN documents.type IS
  'offer/invoice/report: nur durch Admin-Anlage. customer_upload: Kunden-Upload (Bild/PDF/etc.).';

-- Admins können alle Objekte lesen (für Zuordnung von Belegen/Kundenakte)
CREATE POLICY "Admins view all objects"
  ON objects FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins view all documents"
  ON documents FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
        AND profiles.role = 'admin'
    )
  );
