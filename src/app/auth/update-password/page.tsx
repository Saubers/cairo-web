import { UpdatePasswordForm } from "@/components/auth/UpdatePasswordForm";

// Deliberately has no server-side session guard: visitors land here
// unauthenticated straight from the reset-password email link, and only
// gain a session once the browser client exchanges the recovery code in
// the URL for one — see `UpdatePasswordForm` for that flow.
export default function UpdatePasswordPage() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-16">
      <h1 className="font-heading text-3xl text-black">Actualizar contraseña</h1>
      <p className="mt-2 text-sm text-gray-500">Elegí una nueva contraseña para tu cuenta.</p>

      <UpdatePasswordForm />
    </div>
  );
}
