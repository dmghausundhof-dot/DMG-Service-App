-- Wartungshistorie und Wartungs-Follow-up entfernen (Fokus: Anlage + KI-Erkennung)

DROP TABLE IF EXISTS maintenance_history CASCADE;

DROP INDEX IF EXISTS idx_assets_next_maintenance_due;

ALTER TABLE assets
  DROP COLUMN IF EXISTS last_maintenance,
  DROP COLUMN IF EXISTS maintenance_interval_months,
  DROP COLUMN IF EXISTS next_maintenance_due,
  DROP COLUMN IF EXISTS ai_maintenance_guide;
