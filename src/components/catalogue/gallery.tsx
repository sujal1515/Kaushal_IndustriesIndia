"use client";

import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/utils";

export type GalleryImage = { src: string; alt: string };

/**
 * Product images for the hero media panel: a square main frame (fills the height it is given
 * on desktop) with thumbnails beside it; thumbnails sit below on small screens.
 */
export function ProductGallery({ images, name }: { images: GalleryImage[]; name: string }) {
  const [active, setActive] = useState(0);
  if (!images.length) {
    return (
      <div className="product-tile grid aspect-square w-full place-items-center font-mono text-[0.875rem] uppercase text-muted min-[992px]:h-full min-[992px]:w-auto">
        Image coming soon
      </div>
    );
  }
  const current = images[Math.min(active, images.length - 1)];
  return (
    <div className="flex w-full flex-col-reverse gap-3 min-[992px]:h-full min-[992px]:w-auto min-[992px]:flex-row min-[992px]:items-end">
      {images.length > 1 && (
        <div className="flex gap-3 min-[992px]:flex-col" role="group" aria-label={`${name} images`}>
          {images.map((img, i) => (
            <button
              key={img.src}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`Show image ${i + 1}: ${img.alt}`}
              aria-pressed={i === active}
              className={cn(
                "product-tile relative h-16 w-16 overflow-hidden border-2 transition-colors duration-300 min-[992px]:h-[4.5rem] min-[992px]:w-[4.5rem]",
                i === active ? "border-accent" : "border-transparent hover:border-line-strong",
              )}
            >
              <Image src={img.src} alt="" fill sizes="80px" className="object-contain p-2" />
            </button>
          ))}
        </div>
      )}
      <div className="media-frame product-tile relative aspect-square w-full min-[992px]:h-full min-[992px]:w-auto">
        {images.map((img, i) => (
          <Image
            key={img.src}
            src={img.src}
            alt={img.alt}
            fill
            priority={i === 0}
            sizes="(min-width: 992px) 30vw, 100vw"
            className={cn("object-contain p-[10%] transition-opacity duration-500", i === active ? "opacity-100" : "opacity-0")}
            aria-hidden={i !== active}
          />
        ))}
        <span className="sr-only" aria-live="polite">
          {current.alt}
        </span>
      </div>
    </div>
  );
}
