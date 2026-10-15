import { z } from "zod";

/**
 * Contact, billing, and shipping address fields collected at checkout.
 * Captured for every order (guest or logged-in) since Argentine
 * logistics/AFIP requirements need a DNI and a full shipping address
 * regardless of account status.
 */
// [SECURITY] Every free-text field has an explicit upper bound. Without one,
// a crafted request body could submit megabyte-sized strings for fields that
// end up stored in `orders` and later rendered in the admin UI and
// transactional emails — a cheap storage/row-bloat abuse vector with no
// legitimate use case (no real name, street, or city needs 500+ characters).
export const checkoutSchema = z.object({
  // Contact & billing
  guestEmail: z.string().trim().email("Ingresá un email válido.").max(254),
  guestName: z.string().trim().min(2, "Ingresá tu nombre completo.").max(120),
  guestPhone: z
    .string()
    .trim()
    .regex(/^[0-9 ()+-]{6,}$/, "Ingresá un teléfono válido.")
    .max(30),
  // DNI/CUIL: at least 7-8 numeric characters, per the non-negotiable rule.
  guestDni: z
    .string()
    .trim()
    .regex(/^[0-9]{7,8}$/, "El DNI/CUIL debe tener 7 u 8 dígitos numéricos."),
  // Shipping address
  guestAddressStreet: z.string().trim().min(1, "Ingresá la calle.").max(200),
  guestAddressNumber: z.string().trim().min(1, "Ingresá la altura.").max(20),
  guestAddressFloorApt: z.string().trim().max(50).optional().or(z.literal("")),
  guestAddressCity: z.string().trim().min(1, "Ingresá la localidad.").max(100),
  guestAddressState: z.string().trim().min(1, "Ingresá la provincia.").max(100),
  guestAddressZip: z.string().trim().min(1, "Ingresá el código postal.").max(20),
});

export type CheckoutFormValues = z.infer<typeof checkoutSchema>;
