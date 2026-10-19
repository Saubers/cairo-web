import Link from "next/link";
import Image from "next/image";
import { Pencil, Plus } from "lucide-react";
import { getAllHeroSlidesForAdmin } from "@/services/heroSlideService";
import { DeleteHeroSlideButton } from "@/components/admin/DeleteHeroSlideButton";
import { HeroSlideActiveToggle } from "@/components/admin/HeroSlideActiveToggle";
import { MoveHeroSlideButtons } from "@/components/admin/MoveHeroSlideButtons";
import { AdminOnly } from "@/components/admin/AdminOnly";
import { PageHeader } from "@/components/admin/ui/PageHeader";
import { Card } from "@/components/admin/ui/Card";

/** Admin hero carousel list (Server Component). */
export default async function AdminCarouselPage() {
  const slides = await getAllHeroSlidesForAdmin();

  return (
    <div className="flex w-full min-w-0 flex-col gap-4">
      <PageHeader
        title="Carrusel (Home)"
        description="Slides mostrados en el carrusel principal de la tienda."
        action={
          <AdminOnly>
            <Link
              href="/admin/carousel/new"
              className="flex items-center gap-2 rounded-md bg-cairo-primary px-4 py-2 text-sm font-medium text-cairo-bg transition-all duration-200 ease-in-out hover:opacity-90"
            >
              <Plus className="h-4 w-4" />
              Nuevo slide
            </Link>
          </AdminOnly>
        }
      />

      <Card className="overflow-hidden">
        <div className="w-full min-w-0 overflow-x-auto">
          <table className="w-full min-w-[800px] table-fixed text-left text-sm">
            <thead>
              <tr className="border-b border-cairo-text/10 text-xs uppercase tracking-wide text-cairo-text/50">
                <th className="w-16 px-6 py-3">Orden</th>
                <th className="w-16 px-6 py-3">Imagen</th>
                <th className="w-1/3 px-6 py-3">Título</th>
                <th className="px-6 py-3">Botón</th>
                <th className="w-28 px-6 py-3">Estado</th>
                <th className="w-28 pl-6 pr-8 py-3" />
              </tr>
            </thead>
            <tbody>
              {slides.map((slide, index) => (
                <tr
                  key={slide.id}
                  className="border-b border-cairo-text/5 transition-colors duration-200 last:border-0 hover:bg-cairo-accent-blue/10"
                >
                  <td className="px-6 py-4">
                    <MoveHeroSlideButtons
                      slideId={slide.id}
                      isFirst={index === 0}
                      isLast={index === slides.length - 1}
                    />
                  </td>
                  <td className="px-6 py-4">
                    <div className="relative h-12 w-12 overflow-hidden rounded-lg bg-cairo-accent-yellow/40">
                      <Image src={slide.imageUrl} alt={slide.title ?? ""} fill className="object-cover" />
                    </div>
                  </td>
                  <td className="truncate px-6 py-4 font-medium text-cairo-text">
                    {slide.title || <span className="text-cairo-text/40">Sin título</span>}
                  </td>
                  <td className="truncate px-6 py-4 text-cairo-text/70">
                    {slide.buttonText && slide.buttonLink ? (
                      slide.buttonText
                    ) : (
                      <span className="text-cairo-text/40">Sin botón</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <HeroSlideActiveToggle slideId={slide.id} isActive={slide.isActive} />
                  </td>
                  <td className="py-4 pl-6 pr-8 text-right">
                    <div className="inline-flex h-10 items-center gap-4">
                      <Link
                        href={`/admin/carousel/${slide.id}/edit`}
                        aria-label="Editar slide"
                        className="rounded-md p-2 text-cairo-text/50 transition-colors duration-200 hover:bg-cairo-accent-blue/30 hover:text-cairo-primary"
                      >
                        <Pencil className="h-4 w-4" />
                      </Link>
                      <AdminOnly>
                        <DeleteHeroSlideButton slideId={slide.id} slideTitle={slide.title ?? ""} />
                      </AdminOnly>
                    </div>
                  </td>
                </tr>
              ))}

              {slides.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-sm text-cairo-text/50">
                    Todavía no hay slides. Creá el primero.
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
