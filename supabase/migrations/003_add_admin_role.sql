-- ============================================
-- 003: Admin Role und erweiterte RLS Policies
-- ============================================
-- Fügt Rolle zu Profiles hinzu und erlaubt Admins volle Kontrolle über Termine

-- 1. Rolle zu Profiles hinzufügen
ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS role text DEFAULT 'customer' 
  CHECK (role IN ('customer', 'admin'));

-- 2. Admin-Policies für Appointments (volle Rechte für Admins)
-- Drop existing policies first to avoid conflicts (optional, but clean)
-- Note: In production, be careful with dropping policies

-- Allow admins to SELECT all appointments
CREATE POLICY "Admins can view all appointments"
  ON appointments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Allow admins to UPDATE all appointments (including status, admin_notes, etc.)
CREATE POLICY "Admins can update all appointments"
  ON appointments FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Allow admins to INSERT appointments (if needed)
CREATE POLICY "Admins can insert appointments"
  ON appointments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Note: Existing customer policies remain for customers.
-- Admins will have access via these new policies (policies are combined with OR in Supabase RLS).

-- 3. Optional: Index for role
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

COMMENT ON COLUMN profiles.role IS 'User role: customer (default) or admin (for DMG Service staff)';
