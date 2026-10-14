import Link from "next/link";
import Image from "next/image";
import { Pencil, Plus } from "lucide-react";
import { getAllCollectionsForAdmin } from "@/services/collectionService";
import { DeleteCollectionButton } from "@/components/admin/DeleteCollectionButton";
import { AdminOnly } from "@/components/admin/AdminOnly";
import { PageHeader } from "@/components/admin/ui/PageHeader";
import { Card } from "@/components/admin/ui/Card";

/** Admin collections list (Server Component). */
export default async function AdminCollectionsPage() {
  const collections = await getAllCollectionsForAdmin();

  return (
    // `min-w-0` lets this column shrink below the table's intrinsic width instead of
    // forcing the page wider; `gap-4` replaces the old `mt-6` margin on the Card.
    <div className="flex w-full min-w-0 flex-col gap-4">
      <PageHeader
        title="Colecciones"
        description="Agrupaciones curadas de productos para la tienda."
        action={
          <AdminOnly>
            <Link
              href="/admin/collections/new"
              className="flex items-center gap-2 rounded-md bg-cairo-primary px-4 py-2 text-sm font-medium text-cairo-bg transition-all duration-200 ease-in-out hover:opacity-90"
            >
              <Plus className="h-4 w-4" />
              Nueva colección
            </Link>
          </AdminOnly>
        }
      />

      <Card className="overflow-hidden">
        {/* Horizontal scroll wrapper: lets admins swipe sideways on mobile to see every
            column instead of the table squashing/breaking the page layout. `min-w-0`
            keeps this wrapper itself shrinkable so `overflow-x-auto` is what activates,
            not a page-wide blowout. */}
        <div className="w-full min-w-0 overflow-x-auto">
        {/* `table-fixed` + explicit `<th>` widths freeze the column layout regardless of cell
            content, so the table never recalculates its widths (and stutters) row to row. */}
        <table className="w-full min-w-[800px] table-fixed text-left text-sm">
          <thead>
            <tr className="border-b border-cairo-text/10 text-xs uppercase tracking-wide text-cairo-text/50">
              <th className="w-16 px-6 py-3">Imagen</th>
              <th className="w-1/3 px-6 py-3">Nombre</th>
              <th className="px-6 py-3">Slug</th>
              <th className="w-28 px-6 py-3">Estado</th>
              <th className="w-36 pl-6 pr-8 py-3" />
            </tr>
          </thead>
          <tbody>
            {collections.map((collection) => (
              <tr
                key={collection.id}
                className="border-b border-cairo-text/5 transition-colors duration-200 last:border-0 hover:bg-cairo-accent-blue/10"
              >
                <td className="px-6 py-4">
                  <div className="relative h-12 w-12 overflow-hidden rounded-lg bg-cairo-accent-yellow/40">
                    {collection.imageUrl && (
                      <Image
                        src={collection.imageUrl}
                        alt={collection.name}
                        fill
                        className="object-cover"
                      />
                    )}
                  </div>
                </td>
                <td className="truncate px-6 py-4 font-medium text-cairo-text">{collection.name}</td>
                <td className="truncate px-6 py-4 text-cairo-text/70">{collection.slug}</td>
                <td className="px-6 py-4">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      collection.isActive
                        ? "bg-cairo-accent-blue/40 text-cairo-text"
                        : "bg-cairo-text/10 text-cairo-text/50"
                    }`}
                  >
                    {collection.isActive ? "Publicada" : "Oculta"}
                  </span>
                </td>
                <td className="py-4 pl-6 pr-8 text-right">
                  {/* `inline-flex` (not `flex`) lets this box honor the cell's `text-right`, so
                      the icons stay flush against the right padding instead of a block-level
                      flex box overflowing past it — which is what glued the trash icon to the
                      table's edge. Fixed `h-10` keeps the row height stable when `AdminOnly`
                      conditionally hides the delete button. */}
                  <div className="inline-flex h-10 items-center gap-4">
                    <Link
                      href={`/admin/collections/${collection.id}/edit`}
                      aria-label="Editar colección"
                      className="rounded-md p-2 text-cairo-text/50 transition-colors duration-200 hover:bg-cairo-accent-blue/30 hover:text-cairo-primary"
                    >
                      <Pencil className="h-4 w-4" />
                    </Link>
                    <AdminOnly>
                      <DeleteCollectionButton
                        collectionId={collection.id}
                        collectionName={collection.name}
                      />
                    </AdminOnly>
                  </div>
                </td>
              </tr>
            ))}

            {collections.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-10 text-center text-sm text-cairo-text/50">
                  Todavía no hay colecciones. Creá la primera.
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
