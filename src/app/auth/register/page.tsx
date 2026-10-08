import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { RegisterForm } from "@/components/auth/RegisterForm";

export default async function RegisterPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Same server-side guard as the login page — an already-logged-in visitor
  // should never see the registration form.
  if (user) {
    redirect("/");
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-16">
      <h1 className="font-heading text-3xl text-cairo-text">Crear cuenta</h1>
      <p className="mt-2 text-sm text-cairo-text/60">Sumate a Cairo en segundos.</p>

      <RegisterForm />

      <p className="mt-6 text-center text-sm text-cairo-text/60">
        ¿Ya tenés cuenta?{" "}
        <Link href="/auth/login" className="text-cairo-primary hover:underline">
          Iniciá sesión
        </Link>
      </p>
    </div>
  );
}
