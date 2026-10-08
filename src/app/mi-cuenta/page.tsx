import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProfileForm } from "@/components/account/ProfileForm";

const DATE_FORMATTER = new Intl.DateTimeFormat("es-AR", {
  dateStyle: "long",
});

/** Raw shape returned by Supabase for the `profiles` table (snake_case columns). */
interface ProfileRow {
  full_name: string | null;
  phone: string | null;
  street_address: string | null;
  apartment: string | null;
  city: string | null;
  province: string | null;
  postal_code: string | null;
  created_at: string;
}

/**
 * Customer account page (Server Component). Redirects to `/auth/login` when
 * there is no active session — this, not the Navbar's `UserMenu`, is the
 * real access boundary for this route.
 */
export default async function MiCuentaPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login?redirect=/mi-cuenta");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, phone, street_address, apartment, city, province, postal_code, created_at")
    .eq("id", user.id)
    .maybeSingle<ProfileRow>();

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="font-heading text-3xl text-cairo-text">Mi Cuenta</h1>
      <p className="mt-2 text-sm text-cairo-text/60">
        Revisá y actualizá tus datos personales.
      </p>

      <div className="mt-8 rounded-lg border border-cairo-text/10 bg-cairo-bg p-6">
        <dl className="space-y-3 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-cairo-text/50">Email</dt>
            <dd className="text-cairo-text">{user.email}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-cairo-text/50">Cliente desde</dt>
            <dd className="text-cairo-text">
              {profile ? DATE_FORMATTER.format(new Date(profile.created_at)) : "—"}
            </dd>
          </div>
        </dl>

        <ProfileForm
          initialFullName={profile?.full_name ?? ""}
          initialPhone={profile?.phone ?? ""}
          initialStreetAddress={profile?.street_address ?? ""}
          initialApartment={profile?.apartment ?? ""}
          initialCity={profile?.city ?? ""}
          initialProvince={profile?.province ?? ""}
          initialPostalCode={profile?.postal_code ?? ""}
        />
      </div>
    </div>
  );
}
