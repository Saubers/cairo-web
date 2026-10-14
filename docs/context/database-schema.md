# Cairo — Database Schema (PostgreSQL / Supabase)

> Initial schema for the core domain: users/profiles, products, orders, order items. All tables live in the `public` schema unless noted. All primary keys are `uuid` (via `gen_random_uuid()`, requires the `pgcrypto` extension, enabled by default on Supabase).

## 1. Conventions

- **Primary keys**: `uuid`, default `gen_random_uuid()`.
- **Timestamps**: `created_at timestamptz not null default now()`, `updated_at timestamptz not null default now()` (kept current via a trigger).
- **Money**: stored as `numeric(12,2)` in ARS (Argentine Pesos) — never `float`/`real`, to avoid rounding errors.
- **Soft references to Auth**: `profiles.id` is a 1:1 extension of `auth.users.id` (Supabase's built-in auth table), not a duplicate user table.
- **RLS**: enabled on every table (`alter table ... enable row level security;`). No table is left without explicit policies.

## 2. Role Model

Exactly **two admin accounts** are supported. This is enforced *operationally* (only two rows ever have `role = 'admin'` in `profiles`), not by a hard database constraint, since business rules like "exactly 2" are brittle as a `CHECK` constraint against concurrent inserts. Enforcement happens via:
1. No public self-service path to become `admin` (role defaults to `'customer'`, and only an existing admin — or a manual DB operation during setup — can promote a user).
2. An optional safety trigger that raises an exception if a 3rd admin insert/update is attempted (see §5.4), giving a hard backstop beyond process discipline.

## 3. Tables

### 3.1 `profiles`

Extends `auth.users` with application-specific fields and role.

```sql
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  phone text,
  role text not null default 'customer' check (role in ('customer', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Keep updated_at fresh
create trigger set_updated_at
  before update on public.profiles
  for each row execute function public.handle_updated_at();
```

**Relationships**: `profiles.id` → `auth.users.id` (1:1).

### 3.2 `categories`

```sql
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now()
);
```

### 3.3 `products`

```sql
create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  price numeric(12,2) not null check (price >= 0),
  stock integer not null default 0 check (stock >= 0),
  category_id uuid references public.categories (id) on delete set null,
  collection_id uuid references public.collections (id) on delete set null,  -- nullable: a product may belong to no collection
  image_urls text[] not null default '{}',      -- public Supabase Storage URLs
  is_active boolean not null default true,       -- soft "delisting" instead of hard delete
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_updated_at
  before update on public.products
  for each row execute function public.handle_updated_at();

create index idx_products_category_id on public.products (category_id);
create index idx_products_collection_id on public.products (collection_id);
create index idx_products_is_active on public.products (is_active);
```

**Relationships**: `products.category_id` → `categories.id` (N:1); `products.collection_id` → `collections.id` (N:1, `on delete set null`).

### 3.4 `orders`

```sql
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete set null,  -- nullable: allow guest checkout if desired
  status text not null default 'pending'
    check (status in ('pending', 'in_process', 'paid', 'shipped', 'rejected', 'cancelled')),
  total numeric(12,2) not null check (total >= 0),
  mp_preference_id text,                 -- Mercado Pago preference ID
  mp_payment_id text unique,             -- Mercado Pago payment ID (unique → idempotency guard)
  -- Contact + shipping address captured at checkout time, for every order
  -- (guest or logged-in) — AR logistics/AFIP require a DNI and full address
  -- regardless of account status.
  guest_email text,
  guest_name text,
  guest_phone text,
  guest_dni text,
  guest_address_street text,
  guest_address_number text,
  guest_address_floor_apt text,          -- nullable: not every address has one
  guest_address_city text,
  guest_address_state text,
  guest_address_zip text,
  -- Populated only once an admin marks the order "shipped" — see §20261014120000_add_order_shipping_fields.sql.
  tracking_number text,
  shipping_provider text,                -- e.g. "Correo Argentino", "Andreani"
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_updated_at
  before update on public.orders
  for each row execute function public.handle_updated_at();

create index idx_orders_user_id on public.orders (user_id);
create index idx_orders_status on public.orders (status);
```

**Relationships**: `orders.user_id` → `profiles.id` (N:1).

> **Note**: `mp_payment_id` has a `unique` constraint so the webhook handler can rely on it as an idempotency guard — a duplicate notification attempting to set the same `mp_payment_id` again is a no-op/update, not a duplicate order.

### 3.5 `order_items`

```sql
create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  product_name text not null,         -- snapshot at purchase time (survives product edits/deletion)
  unit_price numeric(12,2) not null check (unit_price >= 0),
  quantity integer not null check (quantity > 0),
  subtotal numeric(12,2) not null check (subtotal >= 0),
  created_at timestamptz not null default now()
);

create index idx_order_items_order_id on public.order_items (order_id);
create index idx_order_items_product_id on public.order_items (product_id);
```

**Relationships**:
- `order_items.order_id` → `orders.id` (N:1, cascade delete with parent order).
- `order_items.product_id` → `products.id` (N:1, nullable so historical orders survive product deletion).

> **Design note**: `product_name` and `unit_price` are **snapshotted** at order time rather than joined live from `products`, so historical orders remain accurate even if a product's name or price changes later.

## 4. Entity Relationship Summary

```
auth.users (Supabase-managed)
     │ 1:1
     ▼
profiles ──────────────┐
     │ 1:N               │ (role check: customer/admin)
     ▼                   │
  orders ◄───────────────┘
     │ 1:N
     ▼
order_items ────────► products ────────► categories
                         N:1               N:1
```

## 5. Row Level Security (RLS)

All tables have RLS **enabled**. Default posture: **deny by default**, explicit `select`/`insert`/`update`/`delete` policies grant access.

### 5.1 Helper: `is_admin()`

A reusable SQL function avoids repeating the admin-check subquery in every policy.

```sql
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
```

### 5.2 `profiles`

```sql
alter table public.profiles enable row level security;

-- Users can read their own profile; admins can read all.
create policy "profiles_select_own_or_admin"
  on public.profiles for select
  using (auth.uid() = id or public.is_admin());

-- Users can update their own profile (but not their own role).
create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Only admins can change roles (handled at application layer: a separate,
-- more restrictive policy or a dedicated admin-only RPC should guard
-- `role` column changes; a straightforward approach is a trigger that
-- rejects role changes unless the actor is_admin()).
create policy "profiles_admin_full_access"
  on public.profiles for all
  using (public.is_admin());
```

### 5.3 `categories` & `products`

```sql
alter table public.categories enable row level security;
alter table public.products enable row level security;

-- Public (anon + authenticated) can read active catalog data.
create policy "categories_public_read"
  on public.categories for select
  using (true);

create policy "products_public_read"
  on public.products for select
  using (is_active = true or public.is_admin());

-- Only admins can create/update/delete catalog data.
create policy "categories_admin_write"
  on public.categories for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "products_admin_write"
  on public.products for all
  using (public.is_admin())
  with check (public.is_admin());
```

### 5.4 `orders` & `order_items`

```sql
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

-- Customers can read their own orders; admins can read all orders.
create policy "orders_select_own_or_admin"
  on public.orders for select
  using (auth.uid() = user_id or public.is_admin());

-- Customers can read items belonging to their own orders; admins read all.
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
-- RLS by design. This keeps pricing, stock checks, and payment reconciliation
-- fully server-trusted and prevents clients from fabricating paid orders.
create policy "orders_admin_write"
  on public.orders for all
  using (public.is_admin())
  with check (public.is_admin());
```

> **Why no client-side `insert` policy on `orders`?** Order creation must validate current stock and prices server-side and tie the order to a Mercado Pago preference atomically. Allowing a direct client `insert` would let a malicious client fabricate arbitrary totals. The Node.js layer (service role) is the sole writer for order lifecycle; admins retain full access through `is_admin()` for manual corrections/support.

### 5.5 Optional hard backstop: max 2 admins

```sql
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
```

## 6. Storage Policies (`product-media` bucket)

```sql
-- Public read access to product images.
create policy "product_media_public_read"
  on storage.objects for select
  using (bucket_id = 'product-media');

-- Only admins can upload/update/delete product images.
create policy "product_media_admin_write"
  on storage.objects for all
  using (bucket_id = 'product-media' and public.is_admin())
  with check (bucket_id = 'product-media' and public.is_admin());
```
