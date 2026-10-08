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
    <div>
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

      <Card className="mt-6 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-cairo-text/10 text-xs uppercase tracking-wide text-cairo-text/50">
              <th className="px-6 py-3">Imagen</th>
              <th className="px-6 py-3">Nombre</th>
              <th className="px-6 py-3">Slug</th>
              <th className="px-6 py-3">Estado</th>
              <th className="px-6 py-3" />
            </tr>
          </thead>
          <tbody>
            {collections.map((collection) => (
              <tr
                key={collection.id}
                className="border-b border-cairo-text/5 transition-all duration-200 ease-in-out last:border-0 hover:bg-cairo-accent-blue/10"
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
                <td className="px-6 py-4 font-medium text-cairo-text">{collection.name}</td>
                <td className="px-6 py-4 text-cairo-text/70">{collection.slug}</td>
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
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Link
                      href={`/admin/collections/${collection.id}/edit`}
                      aria-label="Editar colección"
                      className="rounded-md p-1.5 text-cairo-text/50 transition-all duration-200 ease-in-out hover:bg-cairo-accent-blue/30 hover:text-cairo-primary"
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
      </Card>
    </div>
  );
}
