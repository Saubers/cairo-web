import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, CreditCard, RotateCcw, Truck } from "lucide-react";
import { getActiveProductById, getRelatedProducts } from "@/services/productService";
import { getCategoryById } from "@/services/categoryService";
import { ProductVariantProvider } from "@/components/storefront/ProductVariantProvider";
import { buildColorOptions } from "@/lib/colorOptions";
import { ProductLoadError } from "@/components/storefront/ProductLoadError";
import { ProductGallerySection } from "@/components/storefront/ProductGallerySection";
import { ProductColorSwatches } from "@/components/storefront/ProductColorSwatches";
import { ProductQuantityAddToCart } from "@/components/storefront/ProductQuantityAddToCart";
import { ShippingCalculator } from "@/components/storefront/ShippingCalculator";
import { ProductCard } from "@/components/storefront/ProductCard";
import { Accordion, type AccordionItemData } from "@/components/ui/Accordion";
import { calculateDiscountedPrice } from "@/lib/utils";
import { readStringParam } from "@/lib/searchParams";

const PRICE_FORMATTER = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

/** Fallback description for products with no `description` set, used in metadata and the page body. */
const DEFAULT_PRODUCT_DESCRIPTION = "Carteras, minibags, totebags y collares. Envíos a todo Argentina.";

/** Trust badges shown under the "add to cart" action, reinforcing purchase confidence at the decision point. */
const TRUST_BADGES: { icon: typeof Truck; label: string }[] = [
  { icon: Truck, label: "Envío a todo el país" },
  { icon: CreditCard, label: "Pagos seguros con Mercado Pago" },
  { icon: RotateCcw, label: "Devoluciones garantizadas" },
];

/** Generic, product-agnostic copy for the care and shipping accordion sections (no dedicated DB fields for these yet). */
const CARE_INSTRUCTIONS =
  "Para mantener tu accesorio Cairo impecable, evitá el contacto con perfumes, cremas y agua. Guardalo en un lugar seco, lejos de la luz solar directa, y limpialo con un paño suave cuando sea necesario.";

const SHIPPING_AND_RETURNS =
  "Realizamos envíos a todo el país a través de nuestros correos asociados. El tiempo estimado de entrega es de 3 a 7 días hábiles según tu localidad. Si tu compra no cumple tus expectativas, contás con 30 días desde la recepción para solicitar un cambio o devolución, siempre que el producto se encuentre en su estado original.";

/**
 * Dynamic per-product metadata, including Open Graph `images`, so sharing a
 * product link on WhatsApp/Instagram previews the product's name, a short
 * description, and its first photo instead of the generic site card.
 */
export async function generateMetadata(
  props: PageProps<"/producto/[id]">,
): Promise<Metadata> {
  const { id } = await props.params;

  // Metadata generation runs as its own Server Component-like render pass —
  // a thrown error here is just as capable of surfacing an opaque error to
  // the crawler/browser, so it gets the same defensive try/catch as the
  // page body below instead of letting a Supabase failure bubble up raw.
  let product: Awaited<ReturnType<typeof getActiveProductById>>;
  try {
    product = await getActiveProductById(id);
  } catch (error) {
    console.error(`[ProductDetailPage:generateMetadata] Failed to load product "${id}":`, error);
    return { title: "Producto no encontrado" };
  }

  if (!product) {
    return { title: "Producto no encontrado" };
  }

  // `title` is combined with the `template` set in the root layout
  // ("%s | Cairo"), so this resolves to "<product name> | Cairo".
  const title = product.name;
  const description = product.description ?? DEFAULT_PRODUCT_DESCRIPTION;
  const image = product.imageUrls[0];

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: image ? [{ url: image }] : undefined,
    },
  };
}

/**
 * Product detail page. Server Component: product, category, and related-
 * product data are fetched directly from Supabase (RLS-governed, public
 * read of active products) so the page is fully server-rendered and
 * crawlable. Only the gallery, the quantity/add-to-cart controls, and the
 * cart badge (inside `ProductCard`) are Client Components.
 */
export default async function ProductDetailPage(props: PageProps<"/producto/[id]">) {
  const { id } = await props.params;
  const searchParams = await props.searchParams;

  // The product itself is the only data this page cannot render without.
  // Any thrown error here (a Supabase outage, an unexpected schema
  // mismatch in variant mapping, etc.) is caught and logged with its
  // `digest` — the pointer back to the full server log entry — instead of
  // letting it propagate, which is what surfaces to the browser as an
  // opaque, unactionable "Minified React error #441".
  let product: Awaited<ReturnType<typeof getActiveProductById>>;
  try {
    product = await getActiveProductById(id);
  } catch (error) {
    const digest = error instanceof Error ? (error as Error & { digest?: string }).digest : undefined;
    console.error(`[ProductDetailPage] Failed to load product "${id}" (digest: ${digest ?? "none"}):`, error);
    return <ProductLoadError />;
  }

  if (!product) {
    notFound();
  }

  // Category and related products are secondary, non-blocking content —
  // if either fails to load, the product itself still renders; only the
  // breadcrumb's category link and the cross-sell section are omitted.
  let category: Awaited<ReturnType<typeof getCategoryById>> = null;
  let relatedProducts: Awaited<ReturnType<typeof getRelatedProducts>> = [];
  try {
    [category, relatedProducts] = await Promise.all([
      getCategoryById(product.categoryId),
      getRelatedProducts(product.categoryId, product.id),
    ]);
  } catch (error) {
    console.error(`[ProductDetailPage] Failed to load category/related products for "${id}":`, error);
  }

  // Resolves the initially selected color from `?color=`, falling back to
  // the product's own base color (always the first entry — see
  // `buildColorOptions`) so a color is always explicitly selected on entry,
  // never left ambiguous.
  const colorParam = readStringParam(searchParams, "color");
  const colorOptions = buildColorOptions(product);
  const initialColor = colorOptions.find((option) => option.colorName === colorParam) ?? colorOptions[0];

  const hasDiscount = product.isDiscountActive && !!product.discountPercentage;
  const discountedPrice = calculateDiscountedPrice(
    product.price,
    product.discountPercentage,
    product.isDiscountActive,
  );

  const accordionItems: AccordionItemData[] = [
    {
      title: "Detalles y materiales",
      content: product.description ?? DEFAULT_PRODUCT_DESCRIPTION,
    },
    {
      title: "Cuidados del accesorio",
      content: CARE_INSTRUCTIONS,
    },
    {
      title: "Envíos y devoluciones",
      content: SHIPPING_AND_RETURNS,
    },
  ];

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      {/* Breadcrumbs: aid SEO and let users jump back to the category without the browser back button.
          `min-h` reserves the row's height up front so nothing shifts if the category link briefly
          takes a moment to appear. Placed above (outside) the two-column grid below. */}
      <nav
        aria-label="Breadcrumb"
        className="mb-6 flex min-h-[24px] items-center gap-1.5 text-xs text-cairo-text/50"
      >
        <Link href="/" className="transition-colors hover:text-cairo-text">
          Inicio
        </Link>
        {category && (
          <>
            <ChevronRight className="h-3 w-3 shrink-0" />
            <Link
              href={`/catalogo?category=${category.slug}`}
              className="transition-colors hover:text-cairo-text"
            >
              {category.name}
            </Link>
          </>
        )}
        <ChevronRight className="h-3 w-3 shrink-0" />
        <span className="truncate text-cairo-text/70">{product.name}</span>
      </nav>

      {/* Default grid `stretch` (no `items-start`) so the left column's box always matches the
          full row height of the (taller, text-heavy) right column — this is the "rail" the
          sticky image travels along as the accordions expand/collapse. */}
      <ProductVariantProvider product={product} initialColor={initialColor}>
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-12">
          {/* Outer div: the "rail". `lg:h-full` only stretches to the grid row's height on
              desktop, where the sticky behavior below needs a tall track to move within as the
              row grows — on mobile (`grid-cols-1`, no sticky) there's no such row to stretch
              into, so forcing `h-full` there would resolve against an indefinite height and blow
              the box out. `min-w-0` stops this grid item from growing past its column track to
              accommodate the thumbnail strip's horizontal scroll content. `relative` provides the
              positioning context for the discount badge's `absolute` placement. */}
          <div className="relative w-full min-w-0 lg:h-full">
            {/* Inner div: the "wagon". This is the element that actually sticks while the user
              scrolls through the rail — independent of how tall the sibling column becomes.
              Sticky only activates on `lg`+: on mobile the two columns stack (`grid-cols-1`),
              so sticking the image would pin it mid-scroll over the text below it. */}
            <div className="lg:sticky lg:top-24">
              {hasDiscount && (
                <span className="absolute left-3 top-3 z-10 rounded-full bg-cairo-primary px-2.5 py-1 text-xs font-semibold text-cairo-bg">
                  -{product.discountPercentage}% OFF
                </span>
              )}
              <ProductGallerySection />
            </div>
          </div>

          {/* `min-w-0` overrides the grid item's default `min-width: auto`, which otherwise lets a
              long, unbroken product name push this column past its track and overflow the viewport. */}
          <div className="min-w-0">
            <h1 className="break-words font-heading text-4xl text-cairo-text">{product.name}</h1>
            {hasDiscount ? (
              <p className="mt-3 flex items-baseline gap-3">
                <span className="text-lg text-cairo-text/50 line-through">
                  {PRICE_FORMATTER.format(product.price)}
                </span>
                <span className="text-3xl font-bold text-cairo-primary">
                  {PRICE_FORMATTER.format(discountedPrice)}
                </span>
              </p>
            ) : (
              <p className="mt-3 text-2xl font-semibold text-cairo-text">
                {PRICE_FORMATTER.format(product.price)}
              </p>
            )}

            {product.description && (
              <p className="mt-4 line-clamp-2 text-sm leading-relaxed text-cairo-text/60">
                {product.description}
              </p>
            )}

            <div className="mt-5">
              <ProductColorSwatches />
            </div>

            <div className="mt-8">
              <ProductQuantityAddToCart />
            </div>

            <div className="mt-3">
              <ShippingCalculator />
            </div>

            {/* Trust badges: reduce purchase-decision friction right next to the primary CTA. */}
            <ul className="mt-5 space-y-2.5 border-t border-cairo-text/10 pt-5">
              {TRUST_BADGES.map(({ icon: Icon, label }) => (
                <li key={label} className="flex items-center gap-2.5 text-xs text-cairo-text/60">
                  <Icon className="h-4 w-4 shrink-0 text-cairo-text/40" />
                  {label}
                </li>
              ))}
            </ul>

            <div className="mt-8">
              <Accordion items={accordionItems} />
            </div>
          </div>
        </div>
      </ProductVariantProvider>

      {relatedProducts.length > 0 && (
        <section className="mt-20">
          <h2 className="font-heading text-2xl text-cairo-text">También te podría gustar</h2>

          {/* Horizontal scroll on mobile; a 4-column grid from `sm` up. */}
          <div className="mt-6 flex gap-4 overflow-x-auto pb-2 sm:grid sm:grid-cols-2 sm:gap-x-4 sm:gap-y-10 sm:overflow-visible lg:grid-cols-4">
            {relatedProducts.map((relatedProduct) => (
              <div key={relatedProduct.id} className="w-40 shrink-0 sm:w-auto">
                <ProductCard product={relatedProduct} />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
