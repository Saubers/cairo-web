import { getCategories } from "@/services/categoryService";
import { CategoryCreatePanel } from "@/components/admin/CategoryCreatePanel";
import { CategoryRowActions } from "@/components/admin/CategoryRowActions";
import { Card } from "@/components/admin/ui/Card";

/** Admin categories list (Server Component) with a collapsible add-category form. */
export default async function AdminCategoriesPage() {
  const categories = await getCategories();

  return (
    // `min-w-0` lets this column shrink below the table's intrinsic width instead of
    // forcing the page wider; `gap-4` replaces the old `mt-6` margin on the Card.
    <div className="flex w-full min-w-0 flex-col gap-4">
      {/* The createCategory Server Action + RLS reject writes independently
          of whether this panel is rendered. */}
      <CategoryCreatePanel />

      <Card className="overflow-hidden">
        {/* Horizontal scroll wrapper: lets admins swipe sideways on mobile to see every
            column instead of the table squashing/breaking the page layout. `min-w-0`
            keeps this wrapper itself shrinkable so `overflow-x-auto` is what activates,
            not a page-wide blowout. */}
        <div className="w-full min-w-0 overflow-x-auto">
        {/* `table-fixed` + explicit `<th>` widths freeze the column layout regardless of cell
            content, so the table never recalculates its widths (and stutters) row to row. */}
        <table className="w-full min-w-[600px] table-fixed text-left text-sm">
          <thead>
            <tr className="border-b border-cairo-text/10 text-xs uppercase tracking-wide text-cairo-text/50">
              <th className="w-1/2 px-6 py-3">Nombre</th>
              <th className="w-1/2 px-6 py-3">Slug</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((category) => (
              <tr
                key={category.id}
                className="border-b border-cairo-text/5 transition-colors duration-200 last:border-0 hover:bg-cairo-accent-blue/10"
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
        </div>
      </Card>
    </div>
  );
}
