import { z } from "zod";

/**
 * Contact, billing, and shipping address fields collected at checkout.
 * Captured for every order (guest or logged-in) since Argentine
 * logistics/AFIP requirements need a DNI and a full shipping address
 * regardless of account status.
 */
export const checkoutSchema = z.object({
  // Contact & billing
  guestEmail: z.string().trim().email("Ingresá un email válido."),
  guestName: z.string().trim().min(2, "Ingresá tu nombre completo."),
  guestPhone: z
    .string()
    .trim()
    .regex(/^[0-9 ()+-]{6,}$/, "Ingresá un teléfono válido."),
  // DNI/CUIL: at least 7-8 numeric characters, per the non-negotiable rule.
  guestDni: z
    .string()
    .trim()
    .regex(/^[0-9]{7,8}$/, "El DNI/CUIL debe tener 7 u 8 dígitos numéricos."),
  // Shipping address
  guestAddressStreet: z.string().trim().min(1, "Ingresá la calle."),
  guestAddressNumber: z.string().trim().min(1, "Ingresá la altura."),
  guestAddressFloorApt: z.string().trim().optional().or(z.literal("")),
  guestAddressCity: z.string().trim().min(1, "Ingresá la localidad."),
  guestAddressState: z.string().trim().min(1, "Ingresá la provincia."),
  guestAddressZip: z.string().trim().min(1, "Ingresá el código postal."),
});

export type CheckoutFormValues = z.infer<typeof checkoutSchema>;
