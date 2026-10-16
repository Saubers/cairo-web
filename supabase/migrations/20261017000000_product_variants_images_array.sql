-- Replaces product_variants.image_url (a single URL) with images text[], so
-- an admin can upload multiple photos per color variant, mirroring
-- products.image_urls. Existing single-image data is preserved as the
-- first (only) element of the new array before the old column is dropped.
alter table public.product_variants add column images text[] not null default '{}';

update public.product_variants set images = array[image_url] where image_url is not null;

alter table public.product_variants drop column image_url;
