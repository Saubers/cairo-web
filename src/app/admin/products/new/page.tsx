import { getCategories } from "@/services/categoryService";
import { getActiveCollections } from "@/services/collectionService";
import { getUniqueColors } from "@/services/productService";
import { ProductForm } from "@/components/admin/ProductForm";
import { BackLink } from "@/components/admin/ui/BackLink";

export default async function NewProductPage() {
  const [categories, collections, colors] = await Promise.all([
    getCategories(),
    getActiveCollections(),
    getUniqueColors(),
  ]);

  return (
    <div className="mx-auto w-full max-w-7xl">
      <BackLink href="/admin/products" label="Productos" />
      <h1 className="mt-2 font-heading text-2xl text-cairo-text">Nuevo producto</h1>
      <div className="mt-6">
        <ProductForm categories={categories} collections={collections} colors={colors} />
      </div>
    </div>
  );
}
