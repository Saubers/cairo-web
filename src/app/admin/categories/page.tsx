import { getCategories } from "@/services/categoryService";
import { CategoryCreatePanel } from "@/components/admin/CategoryCreatePanel";
import { CategoryRowActions } from "@/components/admin/CategoryRowActions";
import { Card } from "@/components/admin/ui/Card";

/** Admin categories list (Server Component) with a collapsible add-category form. */
export default async function AdminCategoriesPage() {
  const categories = await getCategories();

  return (
    <div>
      {/* The createCategory Server Action + RLS reject writes independently
          of whether this panel is rendered. */}
      <CategoryCreatePanel />

      <Card className="mt-6 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-cairo-text/10 text-xs uppercase tracking-wide text-cairo-text/50">
              <th className="px-6 py-3">Nombre</th>
              <th className="px-6 py-3">Slug</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((category) => (
              <tr
                key={category.id}
                className="border-b border-cairo-text/5 transition-all duration-200 ease-in-out last:border-0 hover:bg-cairo-accent-blue/10"
              >
                <CategoryRowActions category={category} />
              </tr>
            ))}

            {categories.length === 0 && (
              <tr>
                <td colSpan={2} className="px-6 py-10 text-center text-sm text-cairo-text/50">
                  Todavía no hay categorías. Creá la primera.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
