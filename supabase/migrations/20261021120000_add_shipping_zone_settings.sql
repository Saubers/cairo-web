-- Adds postal-code shipping zone pricing to `store_settings`, so the
-- admin can configure the exact cost of each of the three shipping zones
-- (local pickup, near, far) from `/admin/configuracion` without a code
-- deploy. `/api/checkout` and the storefront's shipping estimators read
-- these columns as the single source of truth for what a shopper is
-- charged for shipping, replacing the previous subtotal-based flat
-- rate/free-shipping-threshold calculation for that purpose.
--
-- `free_shipping_threshold`/`flat_shipping_rate` are intentionally left in
-- place rather than dropped: no longer used by the checkout calculation,
-- but removing a live column is a destructive, hard-to-reverse change with
-- no requirement driving it here.

alter table public.store_settings
  add column local_postal_code text not null default '2930',
  add column shipping_cost_local numeric(12,2) not null default 0 check (shipping_cost_local >= 0),
  add column shipping_cost_near numeric(12,2) not null default 15000 check (shipping_cost_near >= 0),
  add column shipping_cost_far numeric(12,2) not null default 20000 check (shipping_cost_far >= 0);

-- 4-digit Argentine postal code format — mirrors the validation enforced by
-- `checkoutSchema`/`calculateShippingByPostalCode` on the application side.
alter table public.store_settings
  add constraint store_settings_local_postal_code_format check (local_postal_code ~ '^[0-9]{4}$');
