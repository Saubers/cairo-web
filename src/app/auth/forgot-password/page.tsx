import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";

export default async function ForgotPasswordPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Same server-side guard as the login/register screens — an already
  // logged-in visitor has no business requesting a password reset.
  if (user) {
    redirect("/");
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-16">
      <h1 className="font-heading text-3xl text-black">Recuperar contraseña</h1>
      <p className="mt-2 text-sm text-gray-500">
        Ingresá tu email y te enviamos las instrucciones para restablecerla.
      </p>

      <ForgotPasswordForm />

      <p className="mt-6 text-center text-sm text-gray-500">
        ¿Ya la recordaste?{" "}
        <Link href="/auth/login" className="text-black hover:underline">
          Iniciá sesión
        </Link>
      </p>
    </div>
  );
}
