-- DMG-Service-Administrator: Rolle anhand der Anmelde-E-Mail in auth.users setzen.
-- Voraussetzung: Account existiert bereits (Registrierung / Login mindestens einmal).

UPDATE public.profiles
SET role = 'admin'
WHERE user_id IN (
  SELECT id
  FROM auth.users
  WHERE email IS NOT NULL
    AND lower(trim(email::text)) = lower(trim('luka.basic09@googlemail.com'))
);
