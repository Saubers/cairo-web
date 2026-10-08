"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { login } from "@/app/auth/actions";
import { loginSchema, type LoginFormValues } from "@/lib/validation/authSchemas";

/**
 * Login form (Client Component). `react-hook-form` + zod validate inputs
 * before the Server Action is even called; the Server Action itself
 * re-validates and performs the actual `@supabase/ssr` sign-in, which sets
 * the session via httpOnly cookies.
 */
export function LoginForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [loginSucceeded, setLoginSucceeded] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema) });

  // Nuclear cache fix: a full browser navigation (not the Next.js client
  // router) guarantees every Server Component — starting with the
  // Navbar — re-reads the freshly-set session cookie from scratch. The
  // navigation itself is pushed into an effect because mutating
  // `window.location` is a side effect outside React's render/event model.
  useEffect(() => {
    if (loginSucceeded) {
      window.location.href = "/";
    }
  }, [loginSucceeded]);

  async function onSubmit(values: LoginFormValues): Promise<void> {
    const result = await login(values);

    if (result?.error) {
      toast.error(result.error);
      return;
    }

    setLoginSucceeded(true);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-4" noValidate>
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
            autoComplete="current-password"
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
        {errors.password && (
          <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-md bg-cairo-primary px-4 py-2 text-sm font-medium text-cairo-bg transition-all duration-200 ease-in-out hover:opacity-90 disabled:opacity-50"
      >
        {isSubmitting ? "Ingresando..." : "Ingresar"}
      </button>
    </form>
  );
}
