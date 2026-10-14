import { Layers, Package, Receipt, ShoppingCart, Tags, Wallet } from "lucide-react";
import { getAllProductsForAdmin } from "@/services/productService";
import { getCategories } from "@/services/categoryService";
import { getAllCollectionsForAdmin } from "@/services/collectionService";
import { getOrderStatsForAdmin } from "@/services/orderService";
import { PageHeader } from "@/components/admin/ui/PageHeader";
import { Card } from "@/components/admin/ui/Card";

const CURRENCY_FORMATTER = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

/** Admin dashboard (Server Component): catalog snapshot plus order KPIs. */
export default async function AdminDashboardPage() {
  const [{ totalCount: productCount }, categories, collections, orderStats] = await Promise.all([
    getAllProductsForAdmin(),
    getCategories(),
    getAllCollectionsForAdmin(),
    getOrderStatsForAdmin(),
  ]);

  const catalogStats = [
    { label: "Productos", value: productCount, icon: Package },
    { label: "Categorías", value: categories.length, icon: Tags },
    { label: "Colecciones", value: collections.length, icon: Layers },
  ];

  // Calculate average ticket ensuring no division by zero.
  const averageTicket =
    orderStats.paidOrdersCount > 0 ? orderStats.totalRevenue / orderStats.paidOrdersCount : 0;

  const orderKpis = [
    { label: "Ingresos totales", value: CURRENCY_FORMATTER.format(orderStats.totalRevenue), icon: Wallet },
    { label: "Pedidos del mes", value: orderStats.ordersThisMonth, icon: ShoppingCart },
    // Strictly the computed average — never `totalRevenue` — so this card can
    // never accidentally mirror "Ingresos totales".
    { label: "Ticket promedio", value: CURRENCY_FORMATTER.format(averageTicket), icon: Receipt },
  ];

  return (
    <div>
      <PageHeader title="Dashboard" description="Resumen general del catálogo y las ventas." />

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {orderKpis.map(({ label, value, icon: Icon }) => (
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

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {catalogStats.map(({ label, value, icon: Icon }) => (
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
