-- Enforce required phone number for customer profiles.
-- Existing rows are not rewritten here; the NOT VALID constraint protects new writes immediately.

alter table profiles
  add constraint profiles_customer_phone_required
  check (
    role <> 'customer'
    or (phone is not null and btrim(phone) <> '')
  ) not valid;
