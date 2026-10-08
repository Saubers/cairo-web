-- Cairo — Initial schema migration
-- Source of truth: docs/context/database-schema.md
-- Creates all core tables, helper functions, triggers, RLS policies, and
-- the `product-media` storage bucket + its policies.

-- =========================================================================
-- 1. Shared helper functions
-- =========================================================================

-- Keeps `updated_at` fresh on every row update. Referenced by the
-- `set_updated_at` triggers below (profiles, products, orders).
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- =========================================================================
-- 2. Tables
-- =========================================================================

-- 2.1 profiles ------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  phone text,
  role text not null default 'customer' check (role in ('customer', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_updated_at
  before update on public.profiles
  for each row execute function public.handle_updated_at();

-- 2.2 categories ------------------------------------------------------------
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now()
);

-- 2.3 products ------------------------------------------------------------
create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  price numeric(12,2) not null check (price >= 0),
  stock integer not null default 0 check (stock >= 0),
  category_id uuid references public.categories (id) on delete set null,
  image_urls text[] not null default '{}',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_updated_at
  before update on public.products
  for each row execute function public.handle_updated_at();

create index idx_products_category_id on public.products (category_id);
create index idx_products_is_active on public.products (is_active);

-- 2.4 orders ------------------------------------------------------------
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete set null,
  status text not null default 'pending'
    check (status in ('pending', 'in_process', 'paid', 'rejected', 'cancelled')),
  total numeric(12,2) not null check (total >= 0),
  mp_preference_id text,
  mp_payment_id text unique,
  shipping_address jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_updated_at
  before update on public.orders
  for each row execute function public.handle_updated_at();

create index idx_orders_user_id on public.orders (user_id);
create index idx_orders_status on public.orders (status);

-- 2.5 order_items ------------------------------------------------------------
create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  product_name text not null,
  unit_price numeric(12,2) not null check (unit_price >= 0),
  quantity integer not null check (quantity > 0),
  subtotal numeric(12,2) not null check (subtotal >= 0),
  created_at timestamptz not null default now()
);

create index idx_order_items_order_id on public.order_items (order_id);
create index idx_order_items_product_id on public.order_items (product_id);

-- =========================================================================
-- 3. Row Level Security
-- =========================================================================

-- 3.1 is_admin() helper -----------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- 3.2 profiles ------------------------------------------------------------
alter table public.profiles enable row level security;

create policy "profiles_select_own_or_admin"
  on public.profiles for select
  using (auth.uid() = id or public.is_admin());

create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "profiles_admin_full_access"
  on public.profiles for all
  using (public.is_admin());

-- 3.3 categories & products ------------------------------------------------
alter table public.categories enable row level security;
alter table public.products enable row level security;

create policy "categories_public_read"
  on public.categories for select
  using (true);

create policy "products_public_read"
  on public.products for select
  using (is_active = true or public.is_admin());

create policy "categories_admin_write"
  on public.categories for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "products_admin_write"
  on public.products for all
  using (public.is_admin())
  with check (public.is_admin());

-- 3.4 orders & order_items --------------------------------------------------
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

create policy "orders_select_own_or_admin"
  on public.orders for select
  using (auth.uid() = user_id or public.is_admin());

create policy "order_items_select_own_or_admin"
  on public.order_items for select
  using (
    public.is_admin()
    or exists (
      select 1 from public.orders o
      where o.id = order_items.order_id and o.user_id = auth.uid()
    )
  );

-- INSERT/UPDATE on orders and order_items is NOT granted to the client role.
-- Order creation and status updates happen exclusively through the Node.js
-- business logic layer using the Supabase service role key, which bypasses
-- RLS by design.
create policy "orders_admin_write"
  on public.orders for all
  using (public.is_admin())
  with check (public.is_admin());

-- 3.5 Hard backstop: max 2 admins -------------------------------------------
create or replace function public.enforce_max_two_admins()
returns trigger
language plpgsql
security definer
as $$
begin
  if NEW.role = 'admin' and (
    select count(*) from public.profiles where role = 'admin' and id <> NEW.id
  ) >= 2 then
    raise exception 'Maximum of 2 admin accounts allowed';
  end if;
  return NEW;
end;
$$;

create trigger enforce_max_two_admins_trigger
  before insert or update on public.profiles
  for each row execute function public.enforce_max_two_admins();

-- =========================================================================
-- 4. Storage: product-media bucket
-- =========================================================================

insert into storage.buckets (id, name, public)
values ('product-media', 'product-media', true)
on conflict (id) do nothing;

create policy "product_media_public_read"
  on storage.objects for select
  using (bucket_id = 'product-media');

create policy "product_media_admin_write"
  on storage.objects for all
  using (bucket_id = 'product-media' and public.is_admin())
  with check (bucket_id = 'product-media' and public.is_admin());
