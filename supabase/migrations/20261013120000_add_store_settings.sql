-- Store-wide configurable settings. Replaces the previously hardcoded
-- `FREE_SHIPPING_THRESHOLD`/`FLAT_SHIPPING_RATE` constants in
-- `src/lib/shipping.ts` with a single admin-editable row, so shipping
-- pricing can change without a code deploy.

create table public.store_settings (
  id uuid primary key default gen_random_uuid(),
  free_shipping_threshold numeric(12,2) not null default 55000 check (free_shipping_threshold >= 0),
  flat_shipping_rate numeric(12,2) not null default 6500 check (flat_shipping_rate >= 0),
  updated_at timestamptz not null default now()
);

create trigger set_updated_at
  before update on public.store_settings
  for each row execute function public.handle_updated_at();

alter table public.store_settings enable row level security;

-- Public read: the storefront (AnnouncementBar, CartSummary) and the
-- checkout route all need to read the current shipping settings without
-- requiring an authenticated session.
create policy "store_settings_public_read"
  on public.store_settings for select
  using (true);

-- Writes are restricted to admins only, same model as every other
-- admin-managed table (`categories_admin_write`, `products_admin_write`).
create policy "store_settings_admin_write"
  on public.store_settings for update
  using (public.is_admin())
  with check (public.is_admin());

-- Seed the single settings row with the values that were previously
-- hardcoded, so existing behavior is unchanged until an admin edits them.
insert into public.store_settings (free_shipping_threshold, flat_shipping_rate)
values (55000, 6500);
