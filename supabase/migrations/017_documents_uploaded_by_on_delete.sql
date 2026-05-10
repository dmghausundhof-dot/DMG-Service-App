-- uploaded_by darf die Löschung eines Auth-Users nicht blockieren (z. B. Admin hat Dokumente
-- anderer Kunden hochgeladen). Nach User-Löschung Feld leeren statt FK-Fehler.
ALTER TABLE public.documents
  DROP CONSTRAINT IF EXISTS documents_uploaded_by_fkey;

ALTER TABLE public.documents
  ADD CONSTRAINT documents_uploaded_by_fkey
  FOREIGN KEY (uploaded_by) REFERENCES auth.users(id) ON DELETE SET NULL;
