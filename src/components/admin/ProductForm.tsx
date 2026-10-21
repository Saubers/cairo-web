"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Loader2, Plus, X } from "lucide-react";
import { toast } from "sonner";
import type { Category, Collection, Product } from "@/types";
import { createProduct, updateProduct, type ProductFormInput } from "@/app/admin/products/actions";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/admin/ui/Card";
import { ImageDropzone } from "@/components/admin/ui/ImageDropzone";
import { ColorCombobox } from "@/components/admin/ui/ColorCombobox";

/**
 * A single color-variant row being edited in the form. `localId` is a
 * client-only React key (not persisted — the DB assigns its own `id` on
 * insert), so rows stay stable across add/remove even before a product has
 * ever been saved.
 */
interface VariantRow {
  localId: string;
  colorName: string;
  colorHex: string;
  images: string[];
  stock: string;
}

function emptyVariantRow(): VariantRow {
  return { localId: crypto.randomUUID(), colorName: "", colorHex: "", images: [], stock: "0" };
}

interface ProductFormProps {
  categories: Category[];
  /** Active collections only, used to populate the optional Colección select. */
  collections: Collection[];
  /** Every distinct color currently in use across the catalog (see `getUniqueColors`), offered by the `ColorCombobox` fields below. */
  colors: string[];
  /** When provided, the form edits this product instead of creating a new one. */
  product?: Product;
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const INPUT_CLASS =
  "mt-1 w-full rounded-md border border-cairo-text/20 bg-cairo-bg px-3 py-2 text-sm text-cairo-text outline-none focus:border-cairo-primary";
const LABEL_CLASS = "block text-sm font-medium text-cairo-text";

/**
 * Create/edit form for admin products. A single component handles both
 * modes, branching only on whether `product` is provided.
 *
 * Fields are grouped into cards (General info / Inventory & price / Media)
 * to keep the long form scannable. Images are uploaded directly from the
 * browser to the `product-media` Supabase Storage bucket (authenticated
 * session enforces the `product_media_admin_write` RLS policy), building an
 * array of public URLs. Removing an image only drops it from the array —
 * the uploaded file itself is left in storage.
 */
export function ProductForm({ categories, collections, colors, product }: ProductFormProps) {
  const router = useRouter();
  const isEditing = product !== undefined;

  const [name, setName] = useState(product?.name ?? "");
  const [slug, setSlug] = useState(product?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(isEditing);
  const [description, setDescription] = useState(product?.description ?? "");
  const [price, setPrice] = useState(product ? String(product.price) : "");
  const [stock, setStock] = useState(product ? String(product.stock) : "0");
  const [categoryId, setCategoryId] = useState(product?.categoryId ?? "");
  const [collectionId, setCollectionId] = useState(product?.collectionId ?? "");
  const [color, setColor] = useState(product?.color ?? "");
  const [imageUrls, setImageUrls] = useState<string[]>(product?.imageUrls ?? []);
  const [isActive, setIsActive] = useState(product?.isActive ?? true);
  const [discountPercentage, setDiscountPercentage] = useState(
    product?.discountPercentage !== null && product?.discountPercentage !== undefined
      ? String(product.discountPercentage)
      : "",
  );
  const [isDiscountActive, setIsDiscountActive] = useState(product?.isDiscountActive ?? false);
  const [variants, setVariants] = useState<VariantRow[]>(
    (product?.variants ?? []).map((variant) => ({
      localId: variant.id,
      colorName: variant.colorName,
      colorHex: variant.colorHex ?? "",
      images: variant.images,
      stock: String(variant.stock),
    })),
  );
  /** Tracks which variant row (by `localId`) currently has an image upload in flight. */
  const [uploadingVariantId, setUploadingVariantId] = useState<string | null>(null);

  const [isUploading, setIsUploading] = useState(false);
  // `isPending` keeps the Server Action call off the main thread (no frozen
  // UI while the Edge round-trip is in flight) and drives the submit
  // button's disabled/spinner state below.
  const [isPending, startTransition] = useTransition();

  function handleNameChange(value: string): void {
    setName(value);
    // Auto-derive the slug from the name until the admin edits it directly.
    if (!slugTouched) {
      setSlug(slugify(value));
    }
  }

  async function handleImagesSelected(files: File[]): Promise<void> {
    setIsUploading(true);

    try {
      const supabase = createClient();
      const uploadedUrls: string[] = [];

      for (const file of files) {
        const fileExt = file.name.split(".").pop();
        const fileName = `${crypto.randomUUID()}.${fileExt}`;

        const { error } = await supabase.storage.from("product-media").upload(fileName, file);

        if (error) {
          throw new Error(`Failed to upload image: ${error.message}`);
        }

        const { data } = supabase.storage.from("product-media").getPublicUrl(fileName);
        uploadedUrls.push(data.publicUrl);
      }

      setImageUrls((current) => [...current, ...uploadedUrls]);
    } catch (uploadError) {
      toast.error(uploadError instanceof Error ? uploadError.message : "Unexpected error.");
    } finally {
      setIsUploading(false);
    }
  }

  function handleRemoveImage(urlToRemove: string): void {
    setImageUrls((current) => current.filter((url) => url !== urlToRemove));
  }

  function handleAddVariant(): void {
    setVariants((current) => [...current, emptyVariantRow()]);
  }

  function handleRemoveVariant(localId: string): void {
    setVariants((current) => current.filter((variant) => variant.localId !== localId));
  }

  function handleVariantFieldChange(
    localId: string,
    field: "colorName" | "colorHex" | "stock",
    value: string,
  ): void {
    setVariants((current) =>
      current.map((variant) => (variant.localId === localId ? { ...variant, [field]: value } : variant)),
    );
  }

  /** Uploads one or more photos for a variant's color to the shared `product-media` bucket, same pattern as `handleImagesSelected`. */
  async function handleVariantImagesSelected(localId: string, files: File[]): Promise<void> {
    setUploadingVariantId(localId);

    try {
      const supabase = createClient();
      const uploadedUrls: string[] = [];

      for (const file of files) {
        const fileExt = file.name.split(".").pop();
        const fileName = `${crypto.randomUUID()}.${fileExt}`;

        const { error } = await supabase.storage.from("product-media").upload(fileName, file);

        if (error) {
          throw new Error(`Failed to upload image: ${error.message}`);
        }

        const { data } = supabase.storage.from("product-media").getPublicUrl(fileName);
        uploadedUrls.push(data.publicUrl);
      }

      setVariants((current) =>
        current.map((variant) =>
          variant.localId === localId ? { ...variant, images: [...variant.images, ...uploadedUrls] } : variant,
        ),
      );
    } catch (uploadError) {
      toast.error(uploadError instanceof Error ? uploadError.message : "Unexpected error.");
    } finally {
      setUploadingVariantId(null);
    }
  }

  function handleRemoveVariantImage(localId: string, urlToRemove: string): void {
    setVariants((current) =>
      current.map((variant) =>
        variant.localId === localId
          ? { ...variant, images: variant.images.filter((url) => url !== urlToRemove) }
          : variant,
      ),
    );
  }

  function handleDiscountPercentageChange(value: string): void {
    // Clamp to [0, 100] as the user types, in addition to the input's own
    // `min`/`max` attributes (which browsers don't enforce on every input method).
    if (value === "") {
      setDiscountPercentage(value);
      return;
    }

    const parsed = Number(value);
    if (Number.isNaN(parsed)) return;

    setDiscountPercentage(String(Math.min(100, Math.max(0, parsed))));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();

    // Every variant row needs at least a color name and an uploaded image
    // before it's a valid variant — caught here (not just by the server
    // schema) so the admin gets immediate, specific feedback about which
    // row is incomplete instead of a generic validation error after submit.
    const incompleteVariant = variants.find((variant) => !variant.colorName.trim() || variant.images.length === 0);
    if (incompleteVariant) {
      toast.error("Cada color necesita un nombre y al menos una foto antes de guardar.");
      return;
    }

    const input: ProductFormInput = {
      name,
      slug,
      description,
      price: Number(price),
      stock: Number(stock),
      categoryId: categoryId || null,
      collectionId: collectionId || null,
      color,
      imageUrls,
      isActive,
      discountPercentage: discountPercentage === "" ? null : Number(discountPercentage),
      isDiscountActive,
      variants: variants.map((variant) => ({
        colorName: variant.colorName.trim(),
        colorHex: variant.colorHex.trim() || null,
        images: variant.images,
        stock: Number(variant.stock),
      })),
    };

    startTransition(async () => {
      const result = isEditing
        ? await updateProduct(product.id, input)
        : await createProduct(input);

      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success(isEditing ? "Producto actualizado." : "Producto creado.");
      router.push("/admin/products");
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-8 lg:grid-cols-3">
      {/* Main left column: general info and media, the content-heavy cards
          that benefit most from the extra width. */}
      <div className="flex flex-col gap-8 lg:col-span-2">
        <Card title="Información general" description="Cómo se presenta el producto en la tienda.">
          <div className="space-y-5 px-6 py-5">
            <div>
              <label htmlFor="name" className={LABEL_CLASS}>
                Título
              </label>
              <input
                id="name"
                type="text"
                required
                value={name}
                onChange={(event) => handleNameChange(event.target.value)}
                className={INPUT_CLASS}
              />
            </div>

            <div>
              <label htmlFor="slug" className={LABEL_CLASS}>
                Slug
              </label>
              <input
                id="slug"
                type="text"
                required
                value={slug}
                onChange={(event) => {
                  setSlugTouched(true);
                  setSlug(event.target.value);
                }}
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

            <div>
              <label htmlFor="color" className={LABEL_CLASS}>
                Color (usado solo si no agregás colores/variantes abajo)
              </label>
              <ColorCombobox
                id="color"
                value={color}
                onChange={setColor}
                options={colors}
                placeholder="negro, rojo, beige..."
              />
            </div>
          </div>
        </Card>

        <Card title="Medios" description="Imágenes del producto (podés subir varias).">
          <div className="space-y-4 px-6 py-5">
            {imageUrls.length > 0 && (
              <div className="flex flex-wrap gap-3">
                {imageUrls.map((url) => (
                  <div
                    key={url}
                    className="relative h-24 w-24 overflow-hidden rounded-md border border-cairo-text/10"
                  >
                    <Image src={url} alt="" fill className="object-cover" />
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(url)}
                      aria-label="Quitar imagen"
                      className="absolute right-1 top-1 rounded-full bg-black/60 p-0.5 text-white hover:bg-black/80"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <ImageDropzone multiple isUploading={isUploading} onFilesSelected={handleImagesSelected} />
          </div>
        </Card>

        <Card
          title="Colores (opcional)"
          description="Agregá variantes de color, cada una con su propia foto y stock. Si no agregás ninguna, el producto usa el Color y Stock de arriba."
        >
          <div className="space-y-5 px-6 py-5">
            {variants.map((variant) => (
              <div
                key={variant.localId}
                className="flex flex-col gap-4 rounded-md border border-cairo-text/10 p-4 sm:flex-row"
              >
                <div className="flex w-full flex-col gap-3 sm:w-40">
                  {variant.images.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {variant.images.map((url) => (
                        <div
                          key={url}
                          className="relative h-20 w-20 overflow-hidden rounded-md border border-cairo-text/10"
                        >
                          <Image src={url} alt="" fill className="object-cover" />
                          <button
                            type="button"
                            onClick={() => handleRemoveVariantImage(variant.localId, url)}
                            aria-label="Quitar imagen"
                            className="absolute right-1 top-1 rounded-full bg-black/60 p-0.5 text-white hover:bg-black/80"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <ImageDropzone
                    multiple
                    isUploading={uploadingVariantId === variant.localId}
                    onFilesSelected={(files) => handleVariantImagesSelected(variant.localId, files)}
                    label="Fotos del producto en este color"
                  />
                </div>

                <div className="flex flex-1 flex-col gap-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={LABEL_CLASS}>Nombre del color</label>
                      <ColorCombobox
                        required
                        value={variant.colorName}
                        onChange={(value) => handleVariantFieldChange(variant.localId, "colorName", value)}
                        options={colors}
                        placeholder="negro, rojo, beige..."
                      />
                    </div>

                    <div>
                      <label className={LABEL_CLASS}>Código hex (opcional)</label>
                      <div className="mt-1 flex items-center gap-2">
                        <input
                          type="color"
                          value={/^#([0-9a-fA-F]{6})$/.test(variant.colorHex) ? variant.colorHex : "#000000"}
                          onChange={(event) =>
                            handleVariantFieldChange(variant.localId, "colorHex", event.target.value)
                          }
                          className="h-9 w-9 shrink-0 rounded border border-cairo-text/20"
                        />
                        <input
                          type="text"
                          value={variant.colorHex}
                          onChange={(event) =>
                            handleVariantFieldChange(variant.localId, "colorHex", event.target.value)
                          }
                          placeholder="#1a1a1a"
                          className={`${INPUT_CLASS} mt-0`}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={LABEL_CLASS}>Stock de este color</label>
                      <input
                        type="number"
                        min={0}
                        required
                        value={variant.stock}
                        onChange={(event) => handleVariantFieldChange(variant.localId, "stock", event.target.value)}
                        className={INPUT_CLASS}
                      />
                    </div>

                    <div className="flex items-end justify-end">
                      <button
                        type="button"
                        onClick={() => handleRemoveVariant(variant.localId)}
                        className="flex items-center gap-1.5 rounded-md border border-cairo-text/20 px-3 py-2 text-sm font-medium text-cairo-text/70 hover:border-red-300 hover:text-red-600"
                      >
                        <X className="h-4 w-4" />
                        Quitar color
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={handleAddVariant}
              className="flex items-center gap-2 rounded-md border border-dashed border-cairo-text/30 px-4 py-2.5 text-sm font-medium text-cairo-text/70 transition-colors hover:border-cairo-primary hover:text-cairo-primary"
            >
              <Plus className="h-4 w-4" />
              Agregar color
            </button>
          </div>
        </Card>
      </div>

      {/* Secondary right column: inventory/pricing, category/collection,
          publish status, and the save action — `sticky` so they stay in
          view while the admin scrolls through the left column. */}
      <div className="flex flex-col gap-8 lg:col-span-1 lg:sticky lg:top-6 lg:self-start">
        <Card>
          <div className="flex gap-3 px-6 py-5">
            <button
              type="submit"
              disabled={isPending || isUploading}
              className="flex flex-1 items-center justify-center gap-2 rounded-md bg-cairo-primary px-5 py-2 text-sm font-medium text-cairo-bg transition-all duration-200 ease-in-out hover:opacity-90 disabled:opacity-50"
            >
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {isPending ? "Guardando..." : isEditing ? "Guardar cambios" : "Crear producto"}
            </button>
            <button
              type="button"
              onClick={() => router.push("/admin/products")}
              className="rounded-md border border-cairo-text/20 px-5 py-2 text-sm font-medium text-cairo-text/70 hover:text-cairo-text"
            >
              Cancelar
            </button>
          </div>
        </Card>

        <Card title="Inventario y precio" description="Stock disponible y precio de venta.">
          <div className="grid grid-cols-2 gap-4 px-6 py-5">
            <div>
              <label htmlFor="price" className={LABEL_CLASS}>
                Precio (ARS)
              </label>
              <input
                id="price"
                type="number"
                min={0}
                required
                value={price}
                onChange={(event) => setPrice(event.target.value)}
                className={INPUT_CLASS}
              />
            </div>

            <div>
              <label htmlFor="stock" className={LABEL_CLASS}>
                Stock
              </label>
              <input
                id="stock"
                type="number"
                min={0}
                required
                value={stock}
                onChange={(event) => setStock(event.target.value)}
                className={INPUT_CLASS}
              />
            </div>
          </div>

          <div className="space-y-4 border-t border-cairo-text/10 px-6 py-5">
            <div>
              <label htmlFor="discountPercentage" className={LABEL_CLASS}>
                Porcentaje de Descuento (%)
              </label>
              <input
                id="discountPercentage"
                type="number"
                min={0}
                max={100}
                value={discountPercentage}
                onChange={(event) => handleDiscountPercentageChange(event.target.value)}
                placeholder="0"
                className={INPUT_CLASS}
              />
            </div>

            <label className="flex items-center gap-2 text-sm text-cairo-text">
              <button
                type="button"
                role="switch"
                aria-checked={isDiscountActive}
                onClick={() => setIsDiscountActive((current) => !current)}
                className={`relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200 ease-in-out ${
                  isDiscountActive ? "bg-cairo-primary" : "bg-cairo-text/20"
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-cairo-bg transition-transform duration-200 ease-in-out ${
                    isDiscountActive ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
              Activar descuento
            </label>
          </div>
        </Card>

        <Card title="Categoría y colección" description="Agrupaciones para la tienda.">
          <div className="space-y-5 px-6 py-5">
            <div>
              <label htmlFor="category" className={LABEL_CLASS}>
                Categoría
              </label>
              <select
                id="category"
                value={categoryId}
                onChange={(event) => setCategoryId(event.target.value)}
                className={INPUT_CLASS}
              >
                <option value="">Sin categoría</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="collection" className={LABEL_CLASS}>
                Colección
              </label>
              <select
                id="collection"
                value={collectionId}
                onChange={(event) => setCollectionId(event.target.value)}
                className={INPUT_CLASS}
              >
                <option value="">Sin colección</option>
                {collections.map((collection) => (
                  <option key={collection.id} value={collection.id}>
                    {collection.name}
                  </option>
                ))}
              </select>
            </div>
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
              Publicado (visible en la tienda)
            </label>
          </div>
        </Card>
      </div>
    </form>
  );
}
