import { notFound } from "next/navigation";
import { getCollectionById } from "@/services/collectionService";
import { getAllProductsForCollectionPicker } from "@/services/productService";
import { CollectionForm } from "@/components/admin/CollectionForm";
import { BackLink } from "@/components/admin/ui/BackLink";

export default async function EditCollectionPage(props: PageProps<"/admin/collections/[id]/edit">) {
  const { id } = await props.params;

  const [collection, products] = await Promise.all([
    getCollectionById(id),
    getAllProductsForCollectionPicker(),
  ]);

  if (!collection) {
    notFound();
  }

  return (
    <div className="mx-auto w-full max-w-7xl">
      <BackLink href="/admin/collections" label="Colecciones" />
      <h1 className="mt-2 font-heading text-2xl text-cairo-text">Editar colección</h1>
      <div className="mt-6">
        <CollectionForm products={products} collection={collection} />
      </div>
    </div>
  );
}
