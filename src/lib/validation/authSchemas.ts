import { z } from "zod";

/**
 * Password policy: at least 8 characters, with at least one letter and one
 * number. Balances real-world security against usability for a retail
 * storefront (no symbol/uppercase requirement, which tends to push users
 * toward predictable substitutions instead of genuinely stronger passwords).
 */
const passwordSchema = z
  .string()
  .min(8, "La contraseña debe tener al menos 8 caracteres.")
  .regex(/[a-zA-Z]/, "La contraseña debe incluir al menos una letra.")
  .regex(/[0-9]/, "La contraseña debe incluir al menos un número.");

export const loginSchema = z.object({
  email: z.email("Ingresá un email válido.").trim().min(1, "Ingresá tu email."),
  password: z.string().min(1, "Ingresá tu contraseña."),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    fullName: z.string().trim().min(2, "Ingresá tu nombre completo."),
    email: z.email("Ingresá un email válido.").trim().min(1, "Ingresá tu email."),
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Confirmá tu contraseña."),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden.",
    path: ["confirmPassword"],
  });

export type RegisterFormValues = z.infer<typeof registerSchema>;
