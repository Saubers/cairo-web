-- Cairo — Guest checkout contact & address fields
-- Source of truth: docs/context/database-schema.md
--
-- Argentine logistics/AFIP requirements mean every order — guest or
-- logged-in — needs a DNI and a full shipping address captured at checkout
-- time. These fields replace the old `shipping_address` jsonb blob with
-- typed columns, and are populated for every order regardless of whether
-- `user_id` is set.

alter table public.orders
  drop column if exists shipping_address;

alter table public.orders
  -- `user_id` stays nullable — guest checkout is allowed by design.
  add column guest_email text,
  add column guest_name text,
  add column guest_phone text,
  add column guest_dni text,
  add column guest_address_street text,
  add column guest_address_number text,
  add column guest_address_floor_apt text,
  add column guest_address_city text,
  add column guest_address_state text,
  add column guest_address_zip text;
