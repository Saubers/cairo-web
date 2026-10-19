-- Cairo — Adds the `hero_slides` table (the storefront home page's hero
-- carousel, previously a hardcoded array in `HeroSlider.tsx`) and its
-- storage bucket for slide background images, so admins can manage the
-- carousel's copy, images, and order without a code deploy.

-- =========================================================================
-- 1. Table
-- =========================================================================

create table public.hero_slides (
  id uuid primary key default gen_random_uuid(),
  image_url text not null,
  title text,
  subtitle text,
  button_text text,
  button_link text,
  display_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_updated_at
  before update on public.hero_slides
  for each row execute function public.handle_updated_at();

-- Powers the storefront's "active slides, in display order" query without a
-- full table scan — the only query pattern the public read path ever runs.
create index idx_hero_slides_is_active_display_order
  on public.hero_slides (is_active, display_order);

-- =========================================================================
-- 2. Row Level Security
-- =========================================================================

alter table public.hero_slides enable row level security;

create policy "hero_slides_public_read"
  on public.hero_slides for select
  using (is_active = true or public.is_admin());

create policy "hero_slides_admin_write"
  on public.hero_slides for all
  using (public.is_admin())
  with check (public.is_admin());

-- =========================================================================
-- 3. Storage: hero-media bucket
-- =========================================================================

insert into storage.buckets (id, name, public)
values ('hero-media', 'hero-media', true)
on conflict (id) do nothing;

create policy "hero_media_public_read"
  on storage.objects for select
  using (bucket_id = 'hero-media');

create policy "hero_media_admin_write"
  on storage.objects for all
  using (bucket_id = 'hero-media' and public.is_admin())
  with check (bucket_id = 'hero-media' and public.is_admin());
