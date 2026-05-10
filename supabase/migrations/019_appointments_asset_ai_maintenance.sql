-- Optionale Verknüpfung Termin → konkrete Anlage
ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS asset_id uuid REFERENCES assets(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_appointments_asset_id ON appointments(asset_id) WHERE asset_id IS NOT NULL;

COMMENT ON COLUMN appointments.asset_id IS 'Optional: Service bezogen auf eine erfasste Anlage (z. B. Wartung dieser Maschine).';

-- KI-Wartungshinweise (Websuche, unverbindlich)
ALTER TABLE assets
  ADD COLUMN IF NOT EXISTS ai_maintenance_guide jsonb;

COMMENT ON COLUMN assets.ai_maintenance_guide IS 'Strukturierte KI-Hinweise zu Wartung/Pflege (Quellen in JSON). Keine Rechts- oder Herstellergarantie.';
