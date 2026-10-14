import Link from "next/link";
import Image from "next/image";
import { Pencil, Plus } from "lucide-react";
import { getAllProductsForAdmin } from "@/services/productService";
import { getCategories } from "@/services/categoryService";
import { DeleteProductButton } from "@/components/admin/DeleteProductButton";
import { ExportProductsButton } from "@/components/admin/ExportProductsButton";
import { DateRangeFilter } from "@/components/admin/DateRangeFilter";
import { AdminOnly } from "@/components/admin/AdminOnly";
import { PageHeader } from "@/components/admin/ui/PageHeader";
import { Card } from "@/components/admin/ui/Card";
import { SearchBar } from "@/components/ui/SearchBar";
import { Pagination } from "@/components/ui/Pagination";
import { readNumberParam, readStringParam } from "@/lib/searchParams";

const PRICE_FORMATTER = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

/**
 * Admin product list (Server Component). Fetches every product (active and
 * inactive) alongside categories so the category name can be resolved per
 * row without an extra round trip per product.
 */
export default async function AdminProductsPage(props: PageProps<"/admin/products">) {
  const searchParams = await props.searchParams;
  const searchQuery = readStringParam(searchParams, "q");
  const page = readNumberParam(searchParams, "page") ?? 1;
  const startDate = readStringParam(searchParams, "startDate");
  const endDate = readStringParam(searchParams, "endDate");

  const [{ data: products, totalPages }, categories] = await Promise.all([
    getAllProductsForAdmin({ searchQuery, page, startDate, endDate }),
    getCategories(),
  ]);

  const categoryNameById = new Map(categories.map((category) => [category.id, category.name]));

  return (
    // `min-w-0` lets this column shrink below the table's intrinsic width instead of
    // forcing the page wider; `gap-4` replaces the children's old individual `mt-*`
    // margins now that spacing is handled uniformly by the flex column.
    <div className="flex w-full min-w-0 flex-col gap-4">
      <PageHeader
        title="Productos"
        description="El catálogo completo de la tienda."
        action={
          <div className="flex items-center gap-3">
            <ExportProductsButton searchQuery={searchQuery} startDate={startDate} endDate={endDate} />
            <AdminOnly>
              <Link
                href="/admin/products/new"
                className="flex items-center gap-2 rounded-md bg-cairo-primary px-4 py-2 text-sm font-medium text-cairo-bg transition-all duration-200 ease-in-out hover:opacity-90"
              >
                <Plus className="h-4 w-4" />
                Nuevo producto
              </Link>
            </AdminOnly>
          </div>
        }
      />

      {/* Mobile-first action bar: search bar and date filter stack full-width on mobile
          (`flex-col`), sitting side by side only from `sm` up. */}
      <div className="flex w-full min-w-0 flex-col flex-wrap items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="w-full min-w-0 flex-1 sm:max-w-sm">
          <SearchBar placeholder="Buscar productos..." />
        </div>
        <DateRangeFilter />
      </div>

      <Card className="overflow-hidden">
        {/* Horizontal scroll wrapper: lets admins swipe sideways on mobile to see every
            column instead of the table squashing/breaking the page layout. `min-w-0`
            keeps this wrapper itself shrinkable so `overflow-x-auto` is what activates,
            not a page-wide blowout. */}
        <div className="w-full min-w-0 overflow-x-auto">
        {/* `table-fixed` + explicit `<th>` widths freeze the column layout regardless of cell
            content, so the table never recalculates its widths (and stutters) row to row. */}
        <table className="w-full min-w-[1000px] table-fixed text-left text-sm">
          <thead>
            <tr className="border-b border-cairo-text/10 text-xs uppercase tracking-wide text-cairo-text/50">
              <th className="w-16 px-6 py-3">Imagen</th>
              <th className="w-1/3 px-6 py-3">Nombre</th>
              <th className="px-6 py-3">Categoría</th>
              <th className="px-6 py-3">Color</th>
              <th className="w-32 px-6 py-3">Precio</th>
              <th className="w-20 px-6 py-3">Stock</th>
              <th className="w-28 px-6 py-3">Estado</th>
              <th className="w-36 pl-6 pr-8 py-3" />
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr
                key={product.id}
                className="border-b border-cairo-text/5 transition-colors duration-200 last:border-0 hover:bg-cairo-accent-blue/10"
              >
                <td className="px-6 py-4">
                  <div className="relative h-12 w-12 overflow-hidden rounded-lg bg-cairo-accent-yellow/40">
                    {product.imageUrls[0] && (
                      <Image
                        src={product.imageUrls[0]}
                        alt={product.name}
                        fill
                        className="object-cover"
                      />
                    )}
                  </div>
                </td>
                <td className="truncate px-6 py-4 font-medium text-cairo-text">{product.name}</td>
                <td className="truncate px-6 py-4 text-cairo-text/70">
                  {product.categoryId ? categoryNameById.get(product.categoryId) ?? "—" : "—"}
                </td>
                <td className="truncate px-6 py-4 capitalize text-cairo-text/70">{product.color ?? "—"}</td>
                <td className="px-6 py-4 text-cairo-text/70">
                  {PRICE_FORMATTER.format(product.price)}
                </td>
                <td className="px-6 py-4 text-cairo-text/70">{product.stock}</td>
                <td className="px-6 py-4">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      product.isActive
                        ? "bg-cairo-accent-blue/40 text-cairo-text"
                        : "bg-cairo-text/10 text-cairo-text/50"
                    }`}
                  >
                    {product.isActive ? "Publicado" : "Oculto"}
                  </span>
                </td>
                <td className="py-4 pl-6 pr-8 text-right">
                  {/* `inline-flex` (not `flex`) lets this box honor the cell's `text-right`, so
                      the icons stay flush against the right padding instead of a block-level
                      flex box overflowing past it — which is what glued the trash icon to the
                      table's edge. Fixed `h-10` keeps the row height stable when `AdminOnly`
                      conditionally hides the delete button. */}
                  <div className="inline-flex h-10 items-center gap-4">
                    <Link
                      href={`/admin/products/${product.id}/edit`}
                      aria-label="Editar producto"
                      className="rounded-md p-2 text-cairo-text/50 transition-colors duration-200 hover:bg-cairo-accent-blue/30 hover:text-cairo-primary"
                    >
                      <Pencil className="h-4 w-4" />
                    </Link>
                    <AdminOnly>
                      <DeleteProductButton productId={product.id} productName={product.name} />
                    </AdminOnly>
                  </div>
                </td>
              </tr>
            ))}

            {products.length === 0 && (
              <tr>
                <td colSpan={8} className="px-6 py-10 text-center text-sm text-cairo-text/50">
                  Todavía no hay productos. Creá el primero.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      </Card>

      <Pagination currentPage={page} totalPages={totalPages} />
    </div>
  );
}
