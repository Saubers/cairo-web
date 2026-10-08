import Link from "next/link";
import Image from "next/image";
import { Pencil, Plus } from "lucide-react";
import { getAllProductsForAdmin } from "@/services/productService";
import { getCategories } from "@/services/categoryService";
import { DeleteProductButton } from "@/components/admin/DeleteProductButton";
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

  const [{ data: products, totalPages }, categories] = await Promise.all([
    getAllProductsForAdmin({ searchQuery, page }),
    getCategories(),
  ]);

  const categoryNameById = new Map(categories.map((category) => [category.id, category.name]));

  return (
    <div>
      <PageHeader
        title="Productos"
        description="El catálogo completo de la tienda."
        action={
          <AdminOnly>
            <Link
              href="/admin/products/new"
              className="flex items-center gap-2 rounded-md bg-cairo-primary px-4 py-2 text-sm font-medium text-cairo-bg transition-all duration-200 ease-in-out hover:opacity-90"
            >
              <Plus className="h-4 w-4" />
              Nuevo producto
            </Link>
          </AdminOnly>
        }
      />

      <div className="mt-6 max-w-sm">
        <SearchBar placeholder="Buscar productos..." />
      </div>

      <Card className="mt-4 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-cairo-text/10 text-xs uppercase tracking-wide text-cairo-text/50">
              <th className="px-6 py-3">Imagen</th>
              <th className="px-6 py-3">Nombre</th>
              <th className="px-6 py-3">Categoría</th>
              <th className="px-6 py-3">Color</th>
              <th className="px-6 py-3">Precio</th>
              <th className="px-6 py-3">Stock</th>
              <th className="px-6 py-3">Estado</th>
              <th className="px-6 py-3" />
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr
                key={product.id}
                className="border-b border-cairo-text/5 transition-all duration-200 ease-in-out last:border-0 hover:bg-cairo-accent-blue/10"
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
                <td className="px-6 py-4 font-medium text-cairo-text">{product.name}</td>
                <td className="px-6 py-4 text-cairo-text/70">
                  {product.categoryId ? categoryNameById.get(product.categoryId) ?? "—" : "—"}
                </td>
                <td className="px-6 py-4 capitalize text-cairo-text/70">{product.color ?? "—"}</td>
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
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Link
                      href={`/admin/products/${product.id}/edit`}
                      aria-label="Editar producto"
                      className="rounded-md p-1.5 text-cairo-text/50 transition-all duration-200 ease-in-out hover:bg-cairo-accent-blue/30 hover:text-cairo-primary"
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
      </Card>

      <div className="mt-6">
        <Pagination currentPage={page} totalPages={totalPages} />
      </div>
    </div>
  );
}
