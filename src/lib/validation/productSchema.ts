import { z } from "zod";

/**
 * A single color variant row submitted from the admin `ProductForm`.
 * Mirrors the `product_variants` table (minus `id`/`productId`/timestamps,
 * which the Server Action/DB assign). `colorHex` is optional free-form
 * input, so it's validated loosely (a leading "#" plus 3/6/8 hex digits)
 * rather than tied to a specific color-picker widget's output format.
 */
const productVariantSchema = z.object({
  colorName: z.string().trim().min(1, "El nombre del color es obligatorio."),
  colorHex: z
    .string()
    .trim()
    .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/, "El color debe ser un código hexadecimal válido.")
    .nullable(),
  images: z
    .array(z.string().url("Cada imagen del color debe ser una URL válida."))
    .min(1, "Cada color necesita al menos una foto."),
  stock: z
    .number()
    .int("El stock debe ser un número entero.")
    .min(0, "El stock no puede ser negativo."),
});

/**
 * Server-side validation for the admin product create/update Server
 * Actions. The admin `ProductForm` already constrains these fields
 * client-side (e.g. `min`/`max` on number inputs), but that is a UX
 * convenience only — Server Actions are reachable by any POST that matches
 * their action ID, not only through the rendered form, so this schema is
 * the actual security/data-integrity boundary.
 */
export const productSchema = z.object({
  name: z.string().trim().min(1, "El título es obligatorio."),
  slug: z
    .string()
    .trim()
    .min(1, "El slug es obligatorio.")
    .regex(
      /^[a-z0-9]+(-[a-z0-9]+)*$/,
      "El slug solo puede tener letras minúsculas, números y guiones.",
    ),
  description: z.string().trim(),
  price: z.number().min(0, "El precio no puede ser negativo."),
  stock: z
    .number()
    .int("El stock debe ser un número entero.")
    .min(0, "El stock no puede ser negativo."),
  categoryId: z.string().uuid("Categoría inválida.").nullable(),
  collectionId: z.string().uuid("Colección inválida.").nullable(),
  color: z.string().trim(),
  imageUrls: z.array(z.string().url("Cada imagen debe ser una URL válida.")),
  isActive: z.boolean(),
  // `null` means "no discount has ever been configured" (see `Product.discountPercentage`).
  discountPercentage: z
    .number()
    .min(0, "El descuento no puede ser menor a 0%.")
    .max(100, "El descuento no puede ser mayor a 100%.")
    .nullable(),
  isDiscountActive: z.boolean(),
  // Optional: a product with an empty array keeps behaving exactly like
  // today (single color/stock/images). `unique(product_id, color_name)` is
  // also enforced at the DB level; this check surfaces the same mistake as
  // a friendly message before it ever reaches Postgres.
  variants: z
    .array(productVariantSchema)
    .refine(
      (variants) => new Set(variants.map((variant) => variant.colorName.toLowerCase())).size === variants.length,
      { message: "No puede haber dos colores con el mismo nombre." },
    ),
});

export type ProductFormValues = z.infer<typeof productSchema>;
export type ProductVariantFormValues = z.infer<typeof productVariantSchema>;
