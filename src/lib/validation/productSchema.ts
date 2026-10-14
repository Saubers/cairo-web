import { z } from "zod";

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
});

export type ProductFormValues = z.infer<typeof productSchema>;
