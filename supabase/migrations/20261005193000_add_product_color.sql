-- Cairo — Adds the `color` column to `products`, required for the dynamic
-- color filter on the storefront catalog.

alter table public.products
  add column if not exists color text;

-- Supports the `ilike('color', ...)` filter used by the catalog query and the
-- "available colors" lookup used to populate the filter UI.
create index if not exists idx_products_color on public.products (color);
