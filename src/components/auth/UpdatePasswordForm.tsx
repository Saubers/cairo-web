"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { updatePasswordSchema, type UpdatePasswordFormValues } from "@/lib/validation/authSchemas";

// How long to wait for Supabase to finish exchanging the recovery code (in
// the URL) for a session before telling the user the link looks invalid.
const RECOVERY_SESSION_TIMEOUT_MS = 8000;

// How long the success message stays on screen before redirecting away.
const REDIRECT_DELAY_MS = 2000;

type RecoverySessionStatus = "verifying" | "ready" | "invalid";

/**
 * New-password form (Client Component), rendered on `/auth/update-password`
 * after the user clicks the link from the reset email.
 *
 * With the PKCE flow, `@supabase/ssr`'s browser client automatically
 * exchanges the `?code=` query param in the URL for a session as soon as it
 * is created (`detectSessionInUrl` is on by default) — it fires a
 * `PASSWORD_RECOVERY` auth event once that session is established. The form
 * is kept disabled until that event (or an already-established session) is
 * observed, so `updateUser` is never called without a valid recovery
 * session; if nothing arrives within a short timeout, the link is treated
 * as invalid/expired.
 */
export function UpdatePasswordForm() {
  const router = useRouter();
  const [sessionStatus, setSessionStatus] = useState<RecoverySessionStatus>("verifying");
  const [updateSucceeded, setUpdateSucceeded] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<UpdatePasswordFormValues>({ resolver: zodResolver(updatePasswordSchema) });

  useEffect(() => {
    const supabase = createClient();

    // Covers the case where the session was already established (e.g. the
    // code exchange finished) before this subscription was set up.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSessionStatus("ready");
      }
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && session)) {
        setSessionStatus("ready");
      }
    });

    const timeoutId = setTimeout(() => {
      setSessionStatus((current) => (current === "verifying" ? "invalid" : current));
    }, RECOVERY_SESSION_TIMEOUT_MS);

    return () => {
      subscription.subscription.unsubscribe();
      clearTimeout(timeoutId);
    };
  }, []);

  useEffect(() => {
    if (!updateSucceeded) return;

    // Brief success message, then redirect to the login screen so the user
    // signs in again with the new password.
    const timeoutId = setTimeout(() => {
      router.push("/auth/login");
    }, REDIRECT_DELAY_MS);

    return () => clearTimeout(timeoutId);
  }, [updateSucceeded, router]);

  async function onSubmit(values: UpdatePasswordFormValues): Promise<void> {
    setErrorMessage(null);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({
        password: values.password,
      });

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      setUpdateSucceeded(true);
    } catch {
      setErrorMessage("No pudimos actualizar tu contraseña. Intentá de nuevo.");
    }
  }

  if (updateSucceeded) {
    return (
      <div className="mt-8 rounded-md border border-black/10 bg-gray-50 px-4 py-4 text-sm text-gray-700">
        Tu contraseña se actualizó correctamente. Te vamos a redirigir para que inicies sesión...
      </div>
    );
  }

  if (sessionStatus === "invalid") {
    return (
      <div className="mt-8 rounded-md border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700">
        Este enlace no es válido o ya expiró. Solicitá uno nuevo desde la pantalla de
        recuperación de contraseña.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-4" noValidate>
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-black">
          Nueva contraseña
        </label>
        <div className="relative mt-1">
          <input
            id="password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            disabled={sessionStatus === "verifying"}
            {...register("password")}
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 pr-10 text-sm text-black outline-none focus:border-black disabled:opacity-50"
          />
          <button
            type="button"
            aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
            onClick={() => setShowPassword((current) => !current)}
            className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 transition-colors duration-200 ease-in-out hover:text-black"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {errors.password ? (
          <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>
        ) : (
          <p className="mt-1 text-xs text-gray-400">
            Mínimo 8 caracteres, con al menos una letra y un número.
          </p>
        )}
      </div>

      {errorMessage && <p className="text-sm text-red-600">{errorMessage}</p>}

      <button
        type="submit"
        disabled={isSubmitting || sessionStatus === "verifying"}
        className="w-full rounded-md bg-black px-4 py-2 text-sm font-medium text-white transition-opacity duration-200 ease-in-out hover:opacity-90 disabled:opacity-50"
      >
        {sessionStatus === "verifying"
          ? "Verificando enlace..."
          : isSubmitting
            ? "Guardando..."
            : "Guardar contraseña"}
      </button>
    </form>
  );
}
