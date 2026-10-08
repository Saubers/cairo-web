-- Adds shipping address fields to public.profiles so customers can store a
-- default address in "Mi Cuenta" instead of re-entering it on every order.
alter table public.profiles
  add column postal_code text,
  add column province text,
  add column city text,
  add column street_address text,
  add column apartment text;
