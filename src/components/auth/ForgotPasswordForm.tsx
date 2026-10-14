"use client";

import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createClient } from "@/lib/supabase/client";
import {
  forgotPasswordSchema,
  type ForgotPasswordFormValues,
} from "@/lib/validation/authSchemas";

/**
 * Password-reset request form (Client Component). Calls
 * `resetPasswordForEmail` directly from the browser client — there is no
 * server-side state to set here, just an email Supabase sends out, so a
 * Server Action would add no value over a direct client call.
 *
 * On success the form stays mounted and swaps its own content for a
 * confirmation message instead of navigating away, so the user is never
 * dropped onto a different screen while waiting for the email to arrive.
 */
export function ForgotPasswordForm() {
  const [requestSent, setRequestSent] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormValues>({ resolver: zodResolver(forgotPasswordSchema) });

  // `useWatch` (not `methods.watch()`) is the React Compiler-compatible way
  // to subscribe to a field's live value.
  const emailValue = useWatch({ control, name: "email" });

  // Reuses the same email rule the submit handler validates against (the
  // `email` field of `forgotPasswordSchema`), so the button's color and the
  // actual validation can never disagree.
  const isEmailValid = forgotPasswordSchema.shape.email.safeParse(emailValue).success;

  async function onSubmit(values: ForgotPasswordFormValues): Promise<void> {
    setErrorMessage(null);

    try {
      const supabase = createClient();

      // Routes through the server-side `/auth/callback` (not straight to
      // `/auth/update-password`) so `exchangeCodeForSession` runs server-side
      // and the session cookie is already set before the update-password
      // page's first render — the same fix applied to the signup-confirmation
      // flow, now reused here to avoid the same "auth limbo" symptom.
      // `window.location.origin` keeps this working across environments
      // (local dev, staging, production) without hardcoding a domain.
      const { error } = await supabase.auth.resetPasswordForEmail(values.email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/auth/update-password`,
      });

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      setRequestSent(true);
    } catch {
      // Network failure or an unexpected client error — never let this
      // bubble up as an unhandled rejection.
      setErrorMessage("No pudimos procesar la solicitud. Intentá de nuevo.");
    }
  }

  if (requestSent) {
    return (
      <div className="mt-8 rounded-md border border-black/10 bg-gray-50 px-4 py-4 text-sm text-gray-700">
        Te enviamos un correo con las instrucciones para restablecer tu contraseña. Revisá tu
        bandeja de entrada (y la carpeta de spam, por si acaso).
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-4" noValidate>
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-black">
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          {...register("email")}
          className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-black outline-none focus:border-black"
        />
        {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
      </div>

      {errorMessage && <p className="text-sm text-red-600">{errorMessage}</p>}

      <button
        type="submit"
        disabled={isSubmitting}
        className={`w-full rounded-md px-4 py-2 text-sm font-medium transition-colors duration-200 ease-in-out disabled:opacity-50 ${
          isEmailValid
            ? "bg-cairo-primary text-white hover:opacity-90"
            : "bg-gray-300 text-gray-500"
        }`}
      >
        {isSubmitting ? "Enviando..." : "Enviar instrucciones"}
      </button>
    </form>
  );
}
