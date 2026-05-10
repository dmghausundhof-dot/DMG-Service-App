-- ============================================
-- 002: Erweiterter Termin-Workflow (Rescheduling + Admin-Support)
-- ============================================
-- Für DMG Service Kundenportal
-- Ermöglicht: Termin ändern (Reschedule-Request), Admin-Notizen, klare Status

-- 1. Neue Spalten für Reschedule-Workflow + Admin
ALTER TABLE appointments 
  ADD COLUMN IF NOT EXISTS proposed_preferred_date DATE,
  ADD COLUMN IF NOT EXISTS proposed_time_window TEXT,
  ADD COLUMN IF NOT EXISTS reschedule_reason TEXT,
  ADD COLUMN IF NOT EXISTS reschedule_requested_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS admin_notes TEXT;  -- Interne Notizen von DMG Service

-- 2. Status-Constraint aktualisieren (vollständiger Workflow)
ALTER TABLE appointments 
  DROP CONSTRAINT IF EXISTS appointments_status_check;

ALTER TABLE appointments 
  ADD CONSTRAINT appointments_status_check 
  CHECK (status IN (
    'requested', 
    'confirmed', 
    'in_progress', 
    'completed', 
    'cancelled', 
    'reschedule_requested',
    'rescheduled'
  ));

-- 3. Automatischer updated_at Trigger (falls noch nicht vorhanden)
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at_appointments ON appointments;

CREATE TRIGGER set_updated_at_appointments 
  BEFORE UPDATE ON appointments 
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- 4. Performance-Indizes
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
CREATE INDEX IF NOT EXISTS idx_appointments_proposed_date ON appointments(proposed_preferred_date) 
  WHERE status = 'reschedule_requested';
CREATE INDEX IF NOT EXISTS idx_appointments_reschedule_requested_at ON appointments(reschedule_requested_at) 
  WHERE status = 'reschedule_requested';

-- 5. Praktische Admin-View für schnelle Übersicht (Service-Role)
CREATE OR REPLACE VIEW admin_appointments_overview AS
SELECT 
  a.id,
  a.service_type,
  a.preferred_date,
  a.time_window,
  a.status,
  a.urgency,
  o.name AS object_name,
  o.city,
  o.street,
  a.proposed_preferred_date,
  a.proposed_time_window,
  a.reschedule_reason,
  a.reschedule_requested_at,
  a.admin_notes,
  a.customer_notes,
  a.description,
  a.created_at,
  a.updated_at,
  CASE 
    WHEN a.status = 'reschedule_requested' THEN '⚠️ Änderungswunsch!'
    WHEN a.status = 'requested' THEN '🆕 Neue Anfrage'
    WHEN a.status = 'confirmed' THEN '✅ Bestätigt'
    WHEN a.status = 'rescheduled' THEN '🔄 Verschoben'
    WHEN a.status = 'in_progress' THEN '🚀 In Bearbeitung'
    WHEN a.status = 'completed' THEN '🏁 Abgeschlossen'
    WHEN a.status = 'cancelled' THEN '❌ Storniert'
    ELSE a.status 
  END AS status_badge
FROM appointments a
JOIN objects o ON a.object_id = o.id
ORDER BY 
  CASE 
    WHEN a.status IN ('reschedule_requested', 'requested') THEN 1 
    WHEN a.status = 'confirmed' THEN 2 
    ELSE 3 
  END,
  a.preferred_date ASC;

COMMENT ON TABLE appointments IS 'DMG Service Termin-Workflow: requested → confirmed → (reschedule_requested → rescheduled) | completed | cancelled';
COMMENT ON VIEW admin_appointments_overview IS 'Admin-Übersicht für DMG Service – nutze mit Service Role oder geschütztem Endpoint';
