import { getStoreSettings } from "@/services/storeSettingsService";
import { StoreSettingsForm } from "@/components/admin/StoreSettingsForm";
import { PageHeader } from "@/components/admin/ui/PageHeader";
import { Card } from "@/components/admin/ui/Card";

/** Admin store settings page (Server Component): edits the flat-rate shipping config. */
export default async function AdminConfiguracionPage() {
  const settings = await getStoreSettings();

  return (
    <div>
      <PageHeader title="Configuración" description="Parámetros de envío de la tienda." />

      <Card className="mt-6 max-w-md px-6 py-5">
        <StoreSettingsForm settings={settings} />
      </Card>
    </div>
  );
}
