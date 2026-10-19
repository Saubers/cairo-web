import { notFound } from "next/navigation";
import { getHeroSlideById } from "@/services/heroSlideService";
import { HeroSlideForm } from "@/components/admin/HeroSlideForm";
import { BackLink } from "@/components/admin/ui/BackLink";

export default async function EditHeroSlidePage(props: PageProps<"/admin/carousel/[id]/edit">) {
  const { id } = await props.params;

  const slide = await getHeroSlideById(id);

  if (!slide) {
    notFound();
  }

  return (
    <div className="mx-auto w-full max-w-7xl">
      <BackLink href="/admin/carousel" label="Carrusel" />
      <h1 className="mt-2 font-heading text-2xl text-cairo-text">Editar slide</h1>
      <div className="mt-6">
        <HeroSlideForm slide={slide} />
      </div>
    </div>
  );
}
