"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { updateShippingZoneSettings } from "@/app/admin/configuracion/actions";
import type { StoreSettings } from "@/services/storeSettingsService";

interface ShippingZonesSettingsFormProps {
  settings: StoreSettings;
}

const INPUT_CLASS =
  "mt-1 w-full rounded-md border border-cairo-text/20 bg-cairo-bg px-3 py-2 text-sm text-cairo-text outline-none focus:border-cairo-primary";

/**
 * Edits the postal-code shipping zone pricing on the single `store_settings`
 * row: the actual values `/api/checkout`, `CartSummary`, and
 * `ShippingCalculator` use to charge/preview shipping based on a shopper's
 * postal code.
 */
export function ShippingZonesSettingsForm({ settings }: ShippingZonesSettingsFormProps) {
  const router = useRouter();
  const [localPostalCode, setLocalPostalCode] = useState(settings.localPostalCode);
  const [shippingCostLocal, setShippingCostLocal] = useState(String(settings.shippingCostLocal));
  const [shippingCostNear, setShippingCostNear] = useState(String(settings.shippingCostNear));
  const [shippingCostFar, setShippingCostFar] = useState(String(settings.shippingCostFar));
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const result = await updateShippingZoneSettings(
      settings.id,
      localPostalCode,
      Number(shippingCostLocal),
      Number(shippingCostNear),
      Number(shippingCostFar),
    );

    setIsSubmitting(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    toast.success("Tarifas de envío actualizadas.");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="local-postal-code" className="block text-sm font-medium text-cairo-text">
          Código postal local (showroom)
        </label>
        <input
          id="local-postal-code"
          type="text"
          inputMode="numeric"
          maxLength={4}
          value={localPostalCode}
          onChange={(event) => setLocalPostalCode(event.target.value.replace(/\D/g, "").slice(0, 4))}
          required
          className={INPUT_CLASS}
        />
      </div>

      <div>
        <label htmlFor="shipping-cost-local" className="block text-sm font-medium text-cairo-text">
          Costo zona local (ARS)
        </label>
        <input
          id="shipping-cost-local"
          type="number"
          min={0}
          step={100}
          value={shippingCostLocal}
          onChange={(event) => setShippingCostLocal(event.target.value)}
          required
          className={INPUT_CLASS}
        />
      </div>

      <div>
        <label htmlFor="shipping-cost-near" className="block text-sm font-medium text-cairo-text">
          Costo zona cercana — Centro/PBA/CABA (ARS)
        </label>
        <input
          id="shipping-cost-near"
          type="number"
          min={0}
          step={100}
          value={shippingCostNear}
          onChange={(event) => setShippingCostNear(event.target.value)}
          required
          className={INPUT_CLASS}
        />
      </div>

      <div>
        <label htmlFor="shipping-cost-far" className="block text-sm font-medium text-cairo-text">
          Costo zona lejana — Norte/Sur (ARS)
        </label>
        <input
          id="shipping-cost-far"
          type="number"
          min={0}
          step={100}
          value={shippingCostFar}
          onChange={(event) => setShippingCostFar(event.target.value)}
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
