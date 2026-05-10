-- Falls der Account erst nach 008 existierte, war die erste Beförderung wirkungslos.
-- Diese Migration ist idempotent und setzt die Rolle erneut über auth.users.

UPDATE public.profiles
SET role = 'admin'
WHERE user_id IN (
  SELECT id
  FROM auth.users
  WHERE email IS NOT NULL
    AND lower(trim(email::text)) = lower(trim('luka.basic09@googlemail.com'))
);
