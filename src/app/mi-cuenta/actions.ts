"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { profileSchema } from "@/lib/validation/profileSchema";

export interface UpdateProfileResult {
  error?: string;
}

/**
 * Updates the current user's basic info and shipping address. Scoped to the
 * authenticated user both explicitly (`.eq("id", user.id)`) and by the
 * `profiles_update_own` RLS policy, so a user can never edit another
 * profile even if the client-side check were bypassed.
 */
export async function updateProfile(values: unknown): Promise<UpdateProfileResult> {
  const parsed = profileSchema.safeParse(values);

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Revisá los datos ingresados." };
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Tu sesión expiró. Volvé a iniciar sesión." };
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: parsed.data.fullName,
      phone: parsed.data.phone || null,
      street_address: parsed.data.streetAddress || null,
      apartment: parsed.data.apartment || null,
      city: parsed.data.city || null,
      province: parsed.data.province || null,
      postal_code: parsed.data.postalCode || null,
    })
    .eq("id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/mi-cuenta");
  return {};
}
