-- Ursache für HTTP 500: Policy "Admins can view all profiles" hat beim SELECT wieder
-- public.profiles abgefragt → RLS-Rekursion. Lösung: SECURITY DEFINER (läuft ohne RLS
-- auf profiles) für die Rollenprüfung.

DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

CREATE OR REPLACE FUNCTION public.profile_is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.user_id = auth.uid()
      AND p.role = 'admin'
  );
$$;

REVOKE ALL ON FUNCTION public.profile_is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.profile_is_admin() TO authenticated;

CREATE POLICY "Admins can view all profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (public.profile_is_admin());

COMMENT ON FUNCTION public.profile_is_admin() IS
  'Nur Rollencheck für RLS – vermeidet Rekursion zwischen profiles SELECT und Policies.';
