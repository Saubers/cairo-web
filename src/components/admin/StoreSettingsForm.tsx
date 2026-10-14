"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { updateStoreSettings } from "@/app/admin/configuracion/actions";
import type { StoreSettings } from "@/services/storeSettingsService";

interface StoreSettingsFormProps {
  settings: StoreSettings;
}

const INPUT_CLASS =
  "mt-1 w-full rounded-md border border-cairo-text/20 bg-cairo-bg px-3 py-2 text-sm text-cairo-text outline-none focus:border-cairo-primary";

/** Edits the single `store_settings` row's flat-rate shipping config. */
export function StoreSettingsForm({ settings }: StoreSettingsFormProps) {
  const router = useRouter();
  const [freeShippingThreshold, setFreeShippingThreshold] = useState(String(settings.freeShippingThreshold));
  const [flatShippingRate, setFlatShippingRate] = useState(String(settings.flatShippingRate));
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const result = await updateStoreSettings(
      settings.id,
      Number(freeShippingThreshold),
      Number(flatShippingRate),
    );

    setIsSubmitting(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    toast.success("Configuración actualizada.");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="free-shipping-threshold" className="block text-sm font-medium text-cairo-text">
          Umbral de envío gratis (ARS)
        </label>
        <input
          id="free-shipping-threshold"
          type="number"
          min={0}
          step={100}
          value={freeShippingThreshold}
          onChange={(event) => setFreeShippingThreshold(event.target.value)}
          required
          className={INPUT_CLASS}
        />
      </div>

      <div>
        <label htmlFor="flat-shipping-rate" className="block text-sm font-medium text-cairo-text">
          Tarifa plana de envío (ARS)
        </label>
        <input
          id="flat-shipping-rate"
          type="number"
          min={0}
          step={100}
          value={flatShippingRate}
          onChange={(event) => setFlatShippingRate(event.target.value)}
          required
          className={INPUT_CLASS}
        />
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={isSubmitting}
        className="flex items-center gap-2 rounded-md bg-cairo-primary px-4 py-2 text-sm font-medium text-cairo-bg transition-all duration-200 ease-in-out hover:opacity-90 disabled:opacity-50"
      >
        {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
        {isSubmitting ? "Guardando..." : "Guardar"}
      </button>
    </form>
  );
}
