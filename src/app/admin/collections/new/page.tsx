import { getAllProductsForCollectionPicker } from "@/services/productService";
import { CollectionForm } from "@/components/admin/CollectionForm";
import { BackLink } from "@/components/admin/ui/BackLink";

export default async function NewCollectionPage() {
  const products = await getAllProductsForCollectionPicker();

  return (
    <div className="mx-auto w-full max-w-7xl">
      <BackLink href="/admin/collections" label="Colecciones" />
      <h1 className="mt-2 font-heading text-2xl text-cairo-text">Nueva colección</h1>
      <div className="mt-6">
        <CollectionForm products={products} />
      </div>
    </div>
  );
}
