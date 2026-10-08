-- Cairo — Adds product-level discount support: an optional percentage and a
-- toggle to turn it on/off, so admins can run seasonal/collection promotions
-- without touching the base `price`.

alter table public.products
  add column if not exists discount_percentage numeric,
  add column if not exists is_discount_active boolean not null default false;

-- Guards against invalid percentages being written directly via SQL/admin
-- tooling, independent of any client-side validation.
alter table public.products
  add constraint products_discount_percentage_range
    check (discount_percentage is null or (discount_percentage >= 0 and discount_percentage <= 100));
