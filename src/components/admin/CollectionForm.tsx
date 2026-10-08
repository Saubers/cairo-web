"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Loader2, Search, X } from "lucide-react";
import { toast } from "sonner";
import type { Collection } from "@/types";
import type { ProductPickerItem } from "@/services/productService";
import {
  createCollection,
  updateCollection,
  type CollectionFormInput,
} from "@/app/admin/collections/actions";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/admin/ui/Card";
import { ImageDropzone } from "@/components/admin/ui/ImageDropzone";

interface CollectionFormProps {
  /** Full product catalog (all statuses), used to populate the product picker below. */
  products: ProductPickerItem[];
  /** When provided, the form edits this collection instead of creating a new one. */
  collection?: Collection;
}

const INPUT_CLASS =
  "mt-1 w-full rounded-md border border-cairo-text/20 bg-cairo-bg px-3 py-2 text-sm text-cairo-text outline-none focus:border-cairo-primary";
const LABEL_CLASS = "block text-sm font-medium text-cairo-text";

/**
 * Create/edit form for admin collections. A single component handles both
 * modes, branching only on whether `collection` is provided.
 *
 * The cover image is uploaded directly from the browser to the
 * `collection-media` Supabase Storage bucket (authenticated session
 * enforces the `collection_media_admin_write` RLS policy), then the
 * resulting public URL is stored on the collection row.
 */
export function CollectionForm({ products, collection }: CollectionFormProps) {
  const router = useRouter();
  const isEditing = collection !== undefined;

  const [name, setName] = useState(collection?.name ?? "");
  const [description, setDescription] = useState(collection?.description ?? "");
  const [imageUrl, setImageUrl] = useState(collection?.imageUrl ?? "");
  const [isActive, setIsActive] = useState(collection?.isActive ?? true);

  // Pre-check every product already linked to this collection when editing;
  // empty when creating, since a brand-new collection has no products yet.
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>(() =>
    collection ? products.filter((product) => product.collectionId === collection.id).map((product) => product.id) : [],
  );
  const [productSearchQuery, setProductSearchQuery] = useState("");

  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Local, client-side filter — no fetch/navigation involved, so it stays
  // responsive even against the full, unpaginated product catalog.
  const filteredProducts = useMemo(() => {
    const query = productSearchQuery.trim().toLowerCase();
    if (!query) return products;
    return products.filter((product) => product.name.toLowerCase().includes(query));
  }, [products, productSearchQuery]);

  function handleToggleProduct(productId: string): void {
    setSelectedProductIds((current) =>
      current.includes(productId)
        ? current.filter((id) => id !== productId)
        : [...current, productId],
    );
  }

  async function handleImageSelected(files: File[]): Promise<void> {
    const file = files[0];
    if (!file) return;

    setIsUploading(true);

    try {
      const supabase = createClient();
      const fileExt = file.name.split(".").pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;

      const { error } = await supabase.storage.from("collection-media").upload(fileName, file);

      if (error) {
        throw new Error(`Failed to upload image: ${error.message}`);
      }

      const { data } = supabase.storage.from("collection-media").getPublicUrl(fileName);
      setImageUrl(data.publicUrl);
    } catch (uploadError) {
      toast.error(uploadError instanceof Error ? uploadError.message : "Unexpected error.");
    } finally {
      setIsUploading(false);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setIsSubmitting(true);

    const input: CollectionFormInput = {
      name,
      description,
      imageUrl,
      isActive,
      selectedProductIds,
    };

    const result = isEditing
      ? await updateCollection(collection.id, input)
      : await createCollection(input);

    if (result.error) {
      toast.error(result.error);
      setIsSubmitting(false);
      return;
    }

    toast.success(isEditing ? "Colección actualizada." : "Colección creada.");
    router.push("/admin/collections");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-8 lg:grid-cols-3">
      {/* Main left column: the content-heavy cards (general info, product
          picker) get the extra width here since they benefit most from it. */}
      <div className="flex flex-col gap-8 lg:col-span-2">
        <Card title="Información general" description="Nombre y descripción de la colección.">
          <div className="space-y-5 px-6 py-5">
            <div>
              <label htmlFor="name" className={LABEL_CLASS}>
                Nombre
              </label>
              <input
                id="name"
                type="text"
                required
                value={name}
                onChange={(event) => setName(event.target.value)}
                className={INPUT_CLASS}
              />
            </div>

            <div>
              <label htmlFor="description" className={LABEL_CLASS}>
                Descripción
              </label>
              <textarea
                id="description"
                rows={3}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                className={INPUT_CLASS}
              />
            </div>
          </div>
        </Card>

        <Card
          title="Productos de la Colección"
          description={`${selectedProductIds.length} producto(s) seleccionado(s).`}
        >
          <div className="space-y-3 px-6 py-5">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cairo-text/40" />
              <input
                type="text"
                value={productSearchQuery}
                onChange={(event) => setProductSearchQuery(event.target.value)}
                placeholder="Buscar producto por nombre..."
                aria-label="Buscar producto"
                className="w-full rounded-md border border-cairo-text/20 bg-cairo-bg py-2 pl-9 pr-3 text-sm text-cairo-text outline-none transition-colors duration-200 ease-in-out focus:border-cairo-primary"
              />
            </div>

            <div className="max-h-[32rem] overflow-y-auto rounded-md border border-cairo-text/10">
              {filteredProducts.length > 0 ? (
                <ul className="divide-y divide-cairo-text/5">
                  {filteredProducts.map((product) => {
                    const isChecked = selectedProductIds.includes(product.id);

                    return (
                      <li key={product.id}>
                        <label className="flex items-center gap-3 px-3 py-2 text-sm text-cairo-text hover:bg-cairo-accent-blue/10">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleProduct(product.id)}
                            className="h-4 w-4 shrink-0 rounded border-cairo-text/30"
                          />
                          <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md bg-cairo-accent-yellow/40">
                            {product.imageUrl && (
                              <Image
                                src={product.imageUrl}
                                alt={product.name}
                                fill
                                className="object-cover"
                              />
                            )}
                          </div>
                          <span className="flex-1 truncate">{product.name}</span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="px-3 py-6 text-center text-sm text-cairo-text/50">
                  No encontramos productos que coincidan con la búsqueda.
                </p>
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* Secondary right column: cover image, publish status, and the save
          action — `sticky` so they stay in view while the admin scrolls
          through a long product picker list on the left. */}
      <div className="flex flex-col gap-8 lg:col-span-1 lg:sticky lg:top-6 lg:self-start">
        <Card>
          <div className="flex gap-3 px-6 py-5">
            <button
              type="submit"
              disabled={isSubmitting || isUploading}
              className="flex flex-1 items-center justify-center gap-2 rounded-md bg-cairo-primary px-5 py-2 text-sm font-medium text-cairo-bg transition-all duration-200 ease-in-out hover:opacity-90 disabled:opacity-50"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {isSubmitting ? "Guardando..." : isEditing ? "Guardar cambios" : "Crear colección"}
            </button>
            <button
              type="button"
              onClick={() => router.push("/admin/collections")}
              className="rounded-md border border-cairo-text/20 px-5 py-2 text-sm font-medium text-cairo-text/70 hover:text-cairo-text"
            >
              Cancelar
            </button>
          </div>
        </Card>

        <Card title="Imagen de portada" description="Se muestra en la grilla de colecciones.">
          <div className="space-y-4 px-6 py-5">
            {imageUrl && (
              <div className="relative h-32 w-32 overflow-hidden rounded-md border border-cairo-text/10">
                <Image src={imageUrl} alt="Portada" fill className="object-cover" />
                <button
                  type="button"
                  onClick={() => setImageUrl("")}
                  aria-label="Quitar imagen"
                  className="absolute right-1 top-1 rounded-full bg-black/60 p-0.5 text-white hover:bg-black/80"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}

            <ImageDropzone isUploading={isUploading} onFilesSelected={handleImageSelected} />
          </div>
        </Card>

        <Card title="Estado" description="Visibilidad en la tienda.">
          <div className="px-6 py-5">
            <label className="flex items-center gap-2 text-sm text-cairo-text">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(event) => setIsActive(event.target.checked)}
                className="h-4 w-4 rounded border-cairo-text/30"
              />
              Publicada (visible en la tienda)
            </label>
          </div>
        </Card>
      </div>
    </form>
  );
}
