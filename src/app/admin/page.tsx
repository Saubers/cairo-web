import { Layers, Package, Tags } from "lucide-react";
import { getAllProductsForAdmin } from "@/services/productService";
import { getCategories } from "@/services/categoryService";
import { getAllCollectionsForAdmin } from "@/services/collectionService";
import { PageHeader } from "@/components/admin/ui/PageHeader";
import { Card } from "@/components/admin/ui/Card";

/**
 * Admin dashboard (Server Component). Shows a quick snapshot of catalog
 * size — order metrics (revenue, recent sales) are wired up once the
 * orders admin view exists.
 */
export default async function AdminDashboardPage() {
  const [{ totalCount: productCount }, categories, collections] = await Promise.all([
    getAllProductsForAdmin(),
    getCategories(),
    getAllCollectionsForAdmin(),
  ]);

  const stats = [
    { label: "Productos", value: productCount, icon: Package },
    { label: "Categorías", value: categories.length, icon: Tags },
    { label: "Colecciones", value: collections.length, icon: Layers },
  ];

  return (
    <div>
      <PageHeader title="Dashboard" description="Resumen general del catálogo." />

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map(({ label, value, icon: Icon }) => (
          <Card key={label} className="px-6 py-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-cairo-text/50">{label}</p>
                <p className="mt-1 font-heading text-3xl text-cairo-text">{value}</p>
              </div>
              <div className="rounded-full bg-cairo-accent-yellow p-3">
                <Icon className="h-5 w-5 text-cairo-primary" />
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
