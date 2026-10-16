-- Adds color variants to products. A product with zero variant rows keeps
-- working exactly as before (single `products.color`/`products.stock`/
-- `products.image_urls`); a product WITH variant rows gets a per-color
-- swatch selector, each with its own image and stock, on the storefront.
-- This is purely additive — no existing column is dropped or repurposed.

create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  color_name text not null,
  color_hex text,                           -- optional swatch color, e.g. "#1a1a1a"
  image_url text not null,
  stock integer not null default 0 check (stock >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, color_name)
);

create trigger set_updated_at
  before update on public.product_variants
  for each row execute function public.handle_updated_at();

create index idx_product_variants_product_id on public.product_variants (product_id);

-- RLS: public can read variants of active products (or any variant if
-- admin, mirroring `products_public_read`); only admins can write.
alter table public.product_variants enable row level security;

create policy "product_variants_public_read"
  on public.product_variants for select
  using (
    public.is_admin()
    or exists (
      select 1 from public.products p
      where p.id = product_variants.product_id and p.is_active = true
    )
  );

create policy "product_variants_admin_write"
  on public.product_variants for all
  using (public.is_admin())
  with check (public.is_admin());

-- Atomic, concurrency-safe per-variant stock decrement, mirroring
-- `decrement_product_stock` (see 20261015010000_add_decrement_product_stock_rpc.sql).
-- Called by the Mercado Pago webhook once per `order_items` row that has a
-- `variant_id` set.
create or replace function public.decrement_variant_stock(p_variant_id uuid, p_quantity integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.product_variants
  set stock = greatest(0, stock - p_quantity)
  where id = p_variant_id;
end;
$$;

revoke all on function public.decrement_variant_stock(uuid, integer) from public, anon, authenticated;
grant execute on function public.decrement_variant_stock(uuid, integer) to service_role;

-- Snapshot columns on order_items so historical orders retain which color
-- was bought even after the variant row is later edited/deleted, mirroring
-- the existing `product_name` snapshot pattern.
alter table public.order_items
  add column variant_id uuid references public.product_variants (id) on delete set null,
  add column color_name text;

create index idx_order_items_variant_id on public.order_items (variant_id);
