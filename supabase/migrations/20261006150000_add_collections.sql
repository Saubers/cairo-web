-- Cairo — Adds the `collections` table (curated product groupings shown on
-- the storefront, e.g. "Verano 2026") and its storage bucket for cover
-- images. Also re-asserts the four default categories as an idempotent
-- insert, so a fresh database always has them regardless of whether
-- `supabase/seed.sql` was run.

-- =========================================================================
-- 1. Table
-- =========================================================================

create table public.collections (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  image_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_updated_at
  before update on public.collections
  for each row execute function public.handle_updated_at();

create index idx_collections_is_active on public.collections (is_active);

-- =========================================================================
-- 2. Row Level Security
-- =========================================================================

alter table public.collections enable row level security;

create policy "collections_public_read"
  on public.collections for select
  using (is_active = true or public.is_admin());

create policy "collections_admin_write"
  on public.collections for all
  using (public.is_admin())
  with check (public.is_admin());

-- =========================================================================
-- 3. Storage: collection-media bucket
-- =========================================================================

insert into storage.buckets (id, name, public)
values ('collection-media', 'collection-media', true)
on conflict (id) do nothing;

create policy "collection_media_public_read"
  on storage.objects for select
  using (bucket_id = 'collection-media');

create policy "collection_media_admin_write"
  on storage.objects for all
  using (bucket_id = 'collection-media' and public.is_admin())
  with check (bucket_id = 'collection-media' and public.is_admin());

-- =========================================================================
-- 4. Default categories (idempotent — safe even if seed.sql never ran)
-- =========================================================================

insert into public.categories (name, slug) values
  ('Carteras', 'carteras'),
  ('Collares', 'collares'),
  ('Minibags', 'minibags'),
  ('Totebags', 'totebags')
on conflict (slug) do nothing;
