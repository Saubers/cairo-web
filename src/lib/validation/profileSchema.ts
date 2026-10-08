import { z } from "zod";

/**
 * Basic profile fields editable by the customer from `/mi-cuenta`.
 * `phone` is optional and, when provided, must look like a plausible phone
 * number (digits, spaces, and the symbols typically used in AR numbers).
 *
 * Address fields are optional as a group, but if the user starts filling in
 * a shipping address, `streetAddress`/`city`/`province`/`postalCode` become
 * required together (`apartment` always stays optional) — see the
 * `superRefine` below.
 */
export const profileSchema = z
  .object({
    fullName: z.string().trim().min(2, "Ingresá tu nombre completo."),
    phone: z
      .string()
      .trim()
      .regex(/^[0-9 ()+-]*$/, "Ingresá un teléfono válido.")
      .optional()
      .or(z.literal("")),
    streetAddress: z.string().trim().optional().or(z.literal("")),
    apartment: z.string().trim().optional().or(z.literal("")),
    city: z.string().trim().optional().or(z.literal("")),
    province: z.string().trim().optional().or(z.literal("")),
    postalCode: z.string().trim().optional().or(z.literal("")),
  })
  .superRefine((values, ctx) => {
    const { streetAddress, city, province, postalCode } = values;
    const hasAnyAddressField = Boolean(streetAddress || city || province || postalCode);

    if (!hasAnyAddressField) {
      return;
    }

    if (!streetAddress) {
      ctx.addIssue({
        code: "custom",
        path: ["streetAddress"],
        message: "Ingresá tu dirección.",
      });
    }
    if (!city) {
      ctx.addIssue({ code: "custom", path: ["city"], message: "Ingresá tu ciudad." });
    }
    if (!province) {
      ctx.addIssue({ code: "custom", path: ["province"], message: "Ingresá tu provincia." });
    }
    if (!postalCode) {
      ctx.addIssue({
        code: "custom",
        path: ["postalCode"],
        message: "Ingresá tu código postal.",
      });
    }
  });

export type ProfileFormValues = z.infer<typeof profileSchema>;
