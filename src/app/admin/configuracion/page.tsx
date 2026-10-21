import { getStoreSettings } from "@/services/storeSettingsService";
import { StoreSettingsForm } from "@/components/admin/StoreSettingsForm";
import { ShippingZonesSettingsForm } from "@/components/admin/ShippingZonesSettingsForm";
import { PageHeader } from "@/components/admin/ui/PageHeader";
import { Card } from "@/components/admin/ui/Card";

/** Admin store settings page (Server Component): edits the shipping config. */
export default async function AdminConfiguracionPage() {
  const settings = await getStoreSettings();

  return (
    <div>
      <PageHeader title="Configuración" description="Parámetros de envío de la tienda." />

      <div className="mt-6 flex flex-col gap-6 lg:flex-row">
        <Card className="max-w-md flex-1 px-6 py-5">
          <h2 className="font-heading text-lg text-cairo-text">Tarifas de Envío por Zonas</h2>
          <p className="mt-1 text-xs text-cairo-text/60">
            Costo real cobrado en el checkout, calculado según el código postal ingresado por el comprador.
          </p>
          <div className="mt-4">
            <ShippingZonesSettingsForm settings={settings} />
          </div>
        </Card>

        <Card className="max-w-md flex-1 px-6 py-5">
          <h2 className="font-heading text-lg text-cairo-text">Umbral y tarifa plana (legacy)</h2>
          <p className="mt-1 text-xs text-cairo-text/60">
            Ya no se usa para calcular el total del checkout — reemplazado por las tarifas por zona de la izquierda.
          </p>
          <div className="mt-4">
            <StoreSettingsForm settings={settings} />
          </div>
        </Card>
      </div>
    </div>
  );
}
