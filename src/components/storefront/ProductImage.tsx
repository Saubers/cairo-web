"use client";

import Image, { type ImageProps } from "next/image";
import { useState } from "react";

type ProductImageBlendMode = "normal" | "multiply";

interface ProductImageProps extends Omit<ImageProps, "className" | "onLoad"> {
  /**
   * Visual blend applied to the photo itself. Defaults to `"normal"`, which
   * pairs with a transparent container so a cut-out (calado) product photo
   * blends naturally into the page's cream background.
   *
   * Pass `"multiply"` only as an explicit, per-image opt-in for legacy JPG
   * uploads that still carry a solid white background: multiplying removes
   * the white without needing real transparency. Never default this to
   * `"multiply"` site-wide — it also darkens very light products (e.g. a
   * white bag), so it must stay an opt-in, not an automatic heuristic.
   */
  blendMode?: ProductImageBlendMode;
  /** Extra classes merged onto the underlying `<Image>`, after this component's own. */
  className?: string;
  /** Lifts the photo slightly on hover. Expects an ancestor with the `group` class. */
  hoverLift?: boolean;
}

/**
 * Shared product photo renderer for the catalog carousel and the PDP
 * gallery — presentational only, no product/variant data logic lives here.
 *
 * - `object-contain` (never `object-cover`) so a bag's straps/handles are
 *   never cropped out, regardless of the source photo's aspect ratio.
 * - `drop-shadow` follows the PNG's alpha channel (unlike a box-shadow,
 *   which would draw a hard rectangle), giving a calado product photo a
 *   sense of weight without needing a background box under it.
 * - A cream-toned pulse skeleton covers the image area until the photo
 *   finishes decoding, avoiding an abrupt pop-in.
 */
export function ProductImage({
  blendMode = "normal",
  className = "",
  hoverLift = true,
  alt,
  ...imageProps
}: ProductImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);

  return (
    <>
      {!isLoaded && <div className="absolute inset-0 animate-pulse bg-cairo-accent-yellow/50" aria-hidden="true" />}
      <Image
        {...imageProps}
        alt={alt}
        onLoad={() => setIsLoaded(true)}
        className={[
          "object-contain drop-shadow-md transition-all duration-300",
          hoverLift ? "group-hover:-translate-y-1" : "",
          blendMode === "multiply" ? "mix-blend-multiply" : "",
          isLoaded ? "opacity-100" : "opacity-0",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
      />
    </>
  );
}
