"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { signup } from "@/app/auth/actions";
import { registerSchema, type RegisterFormValues } from "@/lib/validation/authSchemas";

/**
 * Registration form (Client Component). `react-hook-form` + zod validate
 * inputs (including the password-match check) before the Server Action is
 * called; the Server Action re-validates and performs the actual
 * `@supabase/ssr` sign-up.
 */
export function RegisterForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({ resolver: zodResolver(registerSchema) });

  async function onSubmit(values: RegisterFormValues): Promise<void> {
    const result = await signup(values);
    // On success `signup` redirects server-side and never returns; only the
    // error branch reaches this point.
    if (result?.error) {
      toast.error(result.error);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-4" noValidate>
      <div>
        <label htmlFor="fullName" className="block text-sm font-medium text-cairo-text">
          Nombre completo
        </label>
        <input
          id="fullName"
          type="text"
          autoComplete="name"
          {...register("fullName")}
          className="mt-1 w-full rounded-md border border-cairo-text/20 bg-cairo-bg px-3 py-2 text-sm text-cairo-text outline-none focus:border-cairo-primary"
        />
        {errors.fullName && (
          <p className="mt-1 text-xs text-red-600">{errors.fullName.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-cairo-text">
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          {...register("email")}
          className="mt-1 w-full rounded-md border border-cairo-text/20 bg-cairo-bg px-3 py-2 text-sm text-cairo-text outline-none focus:border-cairo-primary"
        />
        {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-cairo-text">
          Contraseña
        </label>
        <div className="relative mt-1">
          <input
            id="password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            {...register("password")}
            className="w-full rounded-md border border-cairo-text/20 bg-cairo-bg px-3 py-2 pr-10 text-sm text-cairo-text outline-none focus:border-cairo-primary"
          />
          <button
            type="button"
            aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
            onClick={() => setShowPassword((current) => !current)}
            className="absolute inset-y-0 right-0 flex items-center px-3 text-cairo-text/50 transition-all duration-200 ease-in-out hover:text-cairo-text"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {errors.password ? (
          <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>
        ) : (
          <p className="mt-1 text-xs text-cairo-text/50">
            Mínimo 8 caracteres, con al menos una letra y un número.
          </p>
        )}
      </div>

      <div>
        <label htmlFor="confirmPassword" className="block text-sm font-medium text-cairo-text">
          Confirmar contraseña
        </label>
        <div className="relative mt-1">
          <input
            id="confirmPassword"
            type={showConfirmPassword ? "text" : "password"}
            autoComplete="new-password"
            {...register("confirmPassword")}
            className="w-full rounded-md border border-cairo-text/20 bg-cairo-bg px-3 py-2 pr-10 text-sm text-cairo-text outline-none focus:border-cairo-primary"
          />
          <button
            type="button"
            aria-label={showConfirmPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
            onClick={() => setShowConfirmPassword((current) => !current)}
            className="absolute inset-y-0 right-0 flex items-center px-3 text-cairo-text/50 transition-all duration-200 ease-in-out hover:text-cairo-text"
          >
            {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {errors.confirmPassword && (
          <p className="mt-1 text-xs text-red-600">{errors.confirmPassword.message}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-md bg-cairo-primary px-4 py-2 text-sm font-medium text-cairo-bg transition-all duration-200 ease-in-out hover:opacity-90 disabled:opacity-50"
      >
        {isSubmitting ? "Creando cuenta..." : "Crear cuenta"}
      </button>
    </form>
  );
}
