-- Kundenanfragen ohne Wunschdatum: Termin setzt nur die Administration (bestätigen/einplanen).
ALTER TABLE appointments
  ALTER COLUMN preferred_date DROP NOT NULL;

COMMENT ON COLUMN appointments.preferred_date IS
  'Von DMG gesetzter Termin; NULL solange Anfrage noch nicht eingeplant (Kunde wählt kein Datum mehr).';
