import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LoginForm } from "@/components/auth/LoginForm";

export default async function LoginPage(props: PageProps<"/auth/login">) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // An already-logged-in visitor has no business on the login screen — bounce
  // them home server-side, before any UI is sent, so there is no flash of
  // the form. `proxy.ts` performs the same check for a faster, cookie-only
  // redirect; this is the authoritative fallback for direct navigation.
  if (user) {
    redirect("/");
  }

  const searchParams = await props.searchParams;
  const message = typeof searchParams.message === "string" ? searchParams.message : undefined;

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-16">
      <h1 className="font-heading text-3xl text-cairo-text">Iniciar sesión</h1>
      <p className="mt-2 text-sm text-cairo-text/60">Ingresá a tu cuenta de Cairo.</p>

      {message && (
        <p className="mt-6 rounded-md bg-cairo-accent-blue/40 px-4 py-2 text-sm text-cairo-text">
          {message}
        </p>
      )}

      <LoginForm />

      <p className="mt-6 text-center text-sm text-cairo-text/60">
        ¿No tenés cuenta?{" "}
        <Link href="/auth/register" className="text-cairo-primary hover:underline">
          Creá una
        </Link>
      </p>
    </div>
  );
}
