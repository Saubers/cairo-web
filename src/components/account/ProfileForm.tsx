"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { updateProfile } from "@/app/mi-cuenta/actions";
import { profileSchema, type ProfileFormValues } from "@/lib/validation/profileSchema";

interface ProfileFormProps {
  initialFullName: string;
  initialPhone: string;
  initialStreetAddress: string;
  initialApartment: string;
  initialCity: string;
  initialProvince: string;
  initialPostalCode: string;
}

/** Editable "Nombre" / "Teléfono" / shipping address form for the `/mi-cuenta` page. */
export function ProfileForm({
  initialFullName,
  initialPhone,
  initialStreetAddress,
  initialApartment,
  initialCity,
  initialProvince,
  initialPostalCode,
}: ProfileFormProps) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: initialFullName,
      phone: initialPhone,
      streetAddress: initialStreetAddress,
      apartment: initialApartment,
      city: initialCity,
      province: initialProvince,
      postalCode: initialPostalCode,
    },
  });

  async function onSubmit(values: ProfileFormValues): Promise<void> {
    setServerError(null);
    setSuccessMessage(null);

    const result = await updateProfile(values);
    if (result?.error) {
      setServerError(result.error);
    } else {
      setSuccessMessage("Tus datos se guardaron correctamente.");
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4" noValidate>
      {serverError && (
        <p className="rounded-md bg-red-50 px-4 py-2 text-sm text-red-700">{serverError}</p>
      )}
      {successMessage && (
        <p className="rounded-md bg-cairo-accent-blue/40 px-4 py-2 text-sm text-cairo-text">
          {successMessage}
        </p>
      )}

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
        <label htmlFor="phone" className="block text-sm font-medium text-cairo-text">
          Teléfono
        </label>
        <input
          id="phone"
          type="tel"
          autoComplete="tel"
          {...register("phone")}
          className="mt-1 w-full rounded-md border border-cairo-text/20 bg-cairo-bg px-3 py-2 text-sm text-cairo-text outline-none focus:border-cairo-primary"
        />
        {errors.phone && <p className="mt-1 text-xs text-red-600">{errors.phone.message}</p>}
      </div>

      <div className="border-t border-cairo-text/10 pt-4">
        <p className="text-sm font-medium text-cairo-text">Dirección de envío</p>
        <p className="mt-1 text-xs text-cairo-text/50">
          Guardá tu dirección para agilizar tus próximas compras.
        </p>

        <div className="mt-3 space-y-4">
          <div>
            <label htmlFor="streetAddress" className="block text-sm font-medium text-cairo-text">
              Dirección
            </label>
            <input
              id="streetAddress"
              type="text"
              autoComplete="street-address"
              {...register("streetAddress")}
              className="mt-1 w-full rounded-md border border-cairo-text/20 bg-cairo-bg px-3 py-2 text-sm text-cairo-text outline-none focus:border-cairo-primary"
            />
            {errors.streetAddress && (
              <p className="mt-1 text-xs text-red-600">{errors.streetAddress.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="apartment" className="block text-sm font-medium text-cairo-text">
              Piso / Depto (opcional)
            </label>
            <input
              id="apartment"
              type="text"
              {...register("apartment")}
              className="mt-1 w-full rounded-md border border-cairo-text/20 bg-cairo-bg px-3 py-2 text-sm text-cairo-text outline-none focus:border-cairo-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="city" className="block text-sm font-medium text-cairo-text">
                Ciudad
              </label>
              <input
                id="city"
                type="text"
                autoComplete="address-level2"
                {...register("city")}
                className="mt-1 w-full rounded-md border border-cairo-text/20 bg-cairo-bg px-3 py-2 text-sm text-cairo-text outline-none focus:border-cairo-primary"
              />
              {errors.city && <p className="mt-1 text-xs text-red-600">{errors.city.message}</p>}
            </div>

            <div>
              <label htmlFor="province" className="block text-sm font-medium text-cairo-text">
                Provincia
              </label>
              <input
                id="province"
                type="text"
                autoComplete="address-level1"
                {...register("province")}
                className="mt-1 w-full rounded-md border border-cairo-text/20 bg-cairo-bg px-3 py-2 text-sm text-cairo-text outline-none focus:border-cairo-primary"
              />
              {errors.province && (
                <p className="mt-1 text-xs text-red-600">{errors.province.message}</p>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="postalCode" className="block text-sm font-medium text-cairo-text">
              Código postal
            </label>
            <input
              id="postalCode"
              type="text"
              autoComplete="postal-code"
              {...register("postalCode")}
              className="mt-1 w-full max-w-[12rem] rounded-md border border-cairo-text/20 bg-cairo-bg px-3 py-2 text-sm text-cairo-text outline-none focus:border-cairo-primary"
            />
            {errors.postalCode && (
              <p className="mt-1 text-xs text-red-600">{errors.postalCode.message}</p>
            )}
          </div>
        </div>
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded-md bg-cairo-primary px-5 py-2 text-sm font-medium text-cairo-bg transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {isSubmitting ? "Guardando..." : "Guardar cambios"}
      </button>
    </form>
  );
}
