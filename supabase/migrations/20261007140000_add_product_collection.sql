-- Cairo — Links products to collections (storefront curated groupings).
-- Source of truth: docs/context/database-schema.md
--
-- A product may belong to at most one collection. Deleting a collection
-- detaches its products (`on delete set null`) instead of deleting them.

alter table public.products
  add column collection_id uuid references public.collections (id) on delete set null;

create index idx_products_collection_id on public.products (collection_id);
