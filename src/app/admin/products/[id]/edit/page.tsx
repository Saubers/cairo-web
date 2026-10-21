import { notFound } from "next/navigation";
import { getCategories } from "@/services/categoryService";
import { getActiveCollections } from "@/services/collectionService";
import { getProductById, getUniqueColors } from "@/services/productService";
import { ProductForm } from "@/components/admin/ProductForm";
import { BackLink } from "@/components/admin/ui/BackLink";

export default async function EditProductPage(props: PageProps<"/admin/products/[id]/edit">) {
  const { id } = await props.params;

  const [product, categories, collections, colors] = await Promise.all([
    getProductById(id),
    getCategories(),
    getActiveCollections(),
    getUniqueColors(),
  ]);

  if (!product) {
    notFound();
  }

  return (
    <div className="mx-auto w-full max-w-7xl">
      <BackLink href="/admin/products" label="Productos" />
      <h1 className="mt-2 font-heading text-2xl text-cairo-text">Editar producto</h1>
      <div className="mt-6">
        <ProductForm categories={categories} collections={collections} colors={colors} product={product} />
      </div>
    </div>
  );
}
