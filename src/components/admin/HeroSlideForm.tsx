"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Loader2, X } from "lucide-react";
import { toast } from "sonner";
import type { HeroSlide } from "@/types";
import { createHeroSlide, updateHeroSlide, type HeroSlideFormInput } from "@/app/admin/carousel/actions";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/admin/ui/Card";
import { ImageDropzone } from "@/components/admin/ui/ImageDropzone";

interface HeroSlideFormProps {
  /** When provided, the form edits this slide instead of creating a new one. */
  slide?: HeroSlide;
}

const INPUT_CLASS =
  "mt-1 w-full rounded-md border border-cairo-text/20 bg-cairo-bg px-3 py-2 text-sm text-cairo-text outline-none focus:border-cairo-primary";
const LABEL_CLASS = "block text-sm font-medium text-cairo-text";

/**
 * Create/edit form for admin hero carousel slides. A single component
 * handles both modes, branching only on whether `slide` is provided.
 *
 * The background image is uploaded directly from the browser to the
 * `hero-media` Supabase Storage bucket (authenticated session enforces the
 * `hero_media_admin_write` RLS policy), then the resulting public URL is
 * stored on the slide row.
 */
export function HeroSlideForm({ slide }: HeroSlideFormProps) {
  const router = useRouter();
  const isEditing = slide !== undefined;

  const [imageUrl, setImageUrl] = useState(slide?.imageUrl ?? "");
  const [title, setTitle] = useState(slide?.title ?? "");
  const [subtitle, setSubtitle] = useState(slide?.subtitle ?? "");
  const [buttonText, setButtonText] = useState(slide?.buttonText ?? "");
  const [buttonLink, setButtonLink] = useState(slide?.buttonLink ?? "");
  const [isActive, setIsActive] = useState(slide?.isActive ?? true);

  const [isUploading, setIsUploading] = useState(false);
  // `isPending` keeps the Server Action call off the main thread (no frozen
  // UI while the Edge round-trip is in flight) and drives the submit
  // button's disabled/spinner state below.
  const [isPending, startTransition] = useTransition();

  async function handleImageSelected(files: File[]): Promise<void> {
    const file = files[0];
    if (!file) return;

    setIsUploading(true);

    try {
      const supabase = createClient();
      const fileExt = file.name.split(".").pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;

      const { error } = await supabase.storage.from("hero-media").upload(fileName, file);

      if (error) {
        throw new Error(`Failed to upload image: ${error.message}`);
      }

      const { data } = supabase.storage.from("hero-media").getPublicUrl(fileName);
      setImageUrl(data.publicUrl);
    } catch (uploadError) {
      toast.error(uploadError instanceof Error ? uploadError.message : "Unexpected error.");
    } finally {
      setIsUploading(false);
    }
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();

    const input: HeroSlideFormInput = {
      imageUrl,
      title,
      subtitle,
      buttonText,
      buttonLink,
      isActive,
    };

    startTransition(async () => {
      const result = isEditing ? await updateHeroSlide(slide.id, input) : await createHeroSlide(input);

      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success(isEditing ? "Slide actualizado." : "Slide creado.");
      router.push("/admin/carousel");
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-8 lg:grid-cols-3">
      {/* Main left column: title/subtitle/CTA copy — the content an admin edits most often. */}
      <div className="flex flex-col gap-8 lg:col-span-2">
        <Card title="Contenido del slide" description="Texto mostrado sobre la imagen de fondo.">
          <div className="space-y-5 px-6 py-5">
            <div>
              <label htmlFor="title" className={LABEL_CLASS}>
                Título
              </label>
              <input
                id="title"
                type="text"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className={INPUT_CLASS}
              />
            </div>

            <div>
              <label htmlFor="subtitle" className={LABEL_CLASS}>
                Subtítulo
              </label>
              <textarea
                id="subtitle"
                rows={2}
                value={subtitle}
                onChange={(event) => setSubtitle(event.target.value)}
                className={INPUT_CLASS}
              />
            </div>
          </div>
        </Card>

        <Card
          title="Botón (opcional)"
          description="Si dejás el texto o el link vacíos, el slide se muestra sin botón."
        >
          <div className="space-y-5 px-6 py-5">
            <div>
              <label htmlFor="buttonText" className={LABEL_CLASS}>
                Texto del botón
              </label>
              <input
                id="buttonText"
                type="text"
                placeholder="Ver colección"
                value={buttonText}
                onChange={(event) => setButtonText(event.target.value)}
                className={INPUT_CLASS}
              />
            </div>

            <div>
              <label htmlFor="buttonLink" className={LABEL_CLASS}>
                Link del botón
              </label>
              <input
                id="buttonLink"
                type="text"
                placeholder="/catalogo"
                value={buttonLink}
                onChange={(event) => setButtonLink(event.target.value)}
                className={INPUT_CLASS}
              />
            </div>
          </div>
        </Card>
      </div>

      {/* Secondary right column: background image, publish status, and the save action. */}
      <div className="flex flex-col gap-8 lg:col-span-1 lg:sticky lg:top-6 lg:self-start">
        <Card>
          <div className="flex gap-3 px-6 py-5">
            <button
              type="submit"
              disabled={isPending || isUploading}
              className="flex flex-1 items-center justify-center gap-2 rounded-md bg-cairo-primary px-5 py-2 text-sm font-medium text-cairo-bg transition-all duration-200 ease-in-out hover:opacity-90 disabled:opacity-50"
            >
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {isPending ? "Guardando..." : isEditing ? "Guardar cambios" : "Crear slide"}
            </button>
            <button
              type="button"
              onClick={() => router.push("/admin/carousel")}
              className="rounded-md border border-cairo-text/20 px-5 py-2 text-sm font-medium text-cairo-text/70 hover:text-cairo-text"
            >
              Cancelar
            </button>
          </div>
        </Card>

        <Card title="Imagen de fondo" description="Se muestra a pantalla completa en el carrusel.">
          <div className="space-y-4 px-6 py-5">
            {imageUrl && (
              <div className="relative h-32 w-full overflow-hidden rounded-md border border-cairo-text/10">
                <Image src={imageUrl} alt="Fondo del slide" fill className="object-cover" />
                <button
                  type="button"
                  onClick={() => setImageUrl("")}
                  aria-label="Quitar imagen"
                  className="absolute right-1 top-1 rounded-full bg-black/60 p-0.5 text-white hover:bg-black/80"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}

            <ImageDropzone isUploading={isUploading} onFilesSelected={handleImageSelected} />
          </div>
        </Card>

        <Card title="Estado" description="Visibilidad en la Home.">
          <div className="px-6 py-5">
            <label className="flex items-center gap-2 text-sm text-cairo-text">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(event) => setIsActive(event.target.checked)}
                className="h-4 w-4 rounded border-cairo-text/30"
              />
              Activo (visible en el carrusel)
            </label>
          </div>
        </Card>
      </div>
    </form>
  );
}
