-- Cairo — Seed data for local development / staging.
-- Safe to re-run: categories and products are upserted by their unique slug.

-- =========================================================================
-- Categories
-- =========================================================================

insert into public.categories (name, slug) values
  ('Carteras', 'carteras'),
  ('Minibags', 'minibags'),
  ('Totebags', 'totebags'),
  ('Collares', 'collares')
on conflict (slug) do nothing;

-- =========================================================================
-- Products
-- Images are Picsum placeholders (stable per fixed seed) standing in for
-- real fashion/accessory photography until real product media is uploaded.
-- =========================================================================

insert into public.products (name, slug, description, price, stock, category_id, color, image_urls, is_active)
values
  (
    'Cartera Clásica Negra',
    'cartera-clasica-negra',
    'Cartera de cuero sintético con cierre dorado, ideal para el día a día.',
    45000,
    10,
    (select id from public.categories where slug = 'carteras'),
    'negro',
    array['https://picsum.photos/seed/cartera-clasica-negra/800/1000'],
    true
  ),
  (
    'Cartera Roja Charol',
    'cartera-roja-charol',
    'Cartera de charol rojo con detalles metálicos, acabado brillante.',
    52000,
    5,
    (select id from public.categories where slug = 'carteras'),
    'rojo',
    array['https://picsum.photos/seed/cartera-roja-charol/800/1000'],
    true
  ),
  (
    'Cartera Beige Textura',
    'cartera-beige-textura',
    'Cartera texturada en beige, estructura rígida con manija corta.',
    38000,
    8,
    (select id from public.categories where slug = 'carteras'),
    'beige',
    array['https://picsum.photos/seed/cartera-beige-textura/800/1000'],
    true
  ),
  (
    'Cartera Bordó Elegante',
    'cartera-bordo-elegante',
    'Cartera bordó de líneas minimalistas, correa desmontable.',
    61000,
    4,
    (select id from public.categories where slug = 'carteras'),
    'bordó',
    array['https://picsum.photos/seed/cartera-bordo-elegante/800/1000'],
    true
  ),
  (
    'Minibag Negra Cadena',
    'minibag-negra-cadena',
    'Minibag negra con cadena dorada, correa cruzada ajustable.',
    28000,
    15,
    (select id from public.categories where slug = 'minibags'),
    'negro',
    array['https://picsum.photos/seed/minibag-negra-cadena/800/1000'],
    true
  ),
  (
    'Minibag Camel Mini',
    'minibag-camel-mini',
    'Minibag color camel, formato compacto, ideal para salidas nocturnas.',
    25500,
    12,
    (select id from public.categories where slug = 'minibags'),
    'camel',
    array['https://picsum.photos/seed/minibag-camel-mini/800/1000'],
    true
  ),
  (
    'Minibag Blanca Verano',
    'minibag-blanca-verano',
    'Minibag blanca de temporada, textura mate y broche imantado.',
    23000,
    9,
    (select id from public.categories where slug = 'minibags'),
    'blanco',
    array['https://picsum.photos/seed/minibag-blanca-verano/800/1000'],
    true
  ),
  (
    'Totebag Suela Grande',
    'totebag-suela-grande',
    'Totebag color suela de gran capacidad, ideal para trabajo o facultad.',
    34000,
    7,
    (select id from public.categories where slug = 'totebags'),
    'suela',
    array['https://picsum.photos/seed/totebag-suela-grande/800/1000'],
    true
  ),
  (
    'Totebag Negra Reforzada',
    'totebag-negra-reforzada',
    'Totebag negra con base reforzada y bolsillo interior con cierre.',
    31000,
    11,
    (select id from public.categories where slug = 'totebags'),
    'negro',
    array['https://picsum.photos/seed/totebag-negra-reforzada/800/1000'],
    true
  ),
  (
    'Totebag Verde Lona',
    'totebag-verde-lona',
    'Totebag de lona verde, estilo casual, doble manija.',
    27500,
    6,
    (select id from public.categories where slug = 'totebags'),
    'verde',
    array['https://picsum.photos/seed/totebag-verde-lona/800/1000'],
    true
  ),
  (
    'Collar Dorado Fino',
    'collar-dorado-fino',
    'Collar dorado de cadena fina, largo ajustable.',
    15500,
    20,
    (select id from public.categories where slug = 'collares'),
    'dorado',
    array['https://picsum.photos/seed/collar-dorado-fino/800/1000'],
    true
  ),
  (
    'Collar Azul Piedra',
    'collar-azul-piedra',
    'Collar con piedra central azul, cadena plateada.',
    18200,
    14,
    (select id from public.categories where slug = 'collares'),
    'azul',
    array['https://picsum.photos/seed/collar-azul-piedra/800/1000'],
    true
  )
on conflict (slug) do nothing;
