import { HeroSlideForm } from "@/components/admin/HeroSlideForm";
import { BackLink } from "@/components/admin/ui/BackLink";

export default function NewHeroSlidePage() {
  return (
    <div className="mx-auto w-full max-w-7xl">
      <BackLink href="/admin/carousel" label="Carrusel" />
      <h1 className="mt-2 font-heading text-2xl text-cairo-text">Nuevo slide</h1>
      <div className="mt-6">
        <HeroSlideForm />
      </div>
    </div>
  );
}
