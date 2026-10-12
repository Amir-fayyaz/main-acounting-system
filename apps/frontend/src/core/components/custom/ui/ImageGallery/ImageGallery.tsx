"use client";

import { getImageUrl } from "@/core/utils/getImageUrl";
import { cn } from "@/core/utils/shadcn/utils";
import { useState } from "react";
import { FiImage } from "react-icons/fi";

interface ImageGalleryProps {
  images: string[];
  alt: string;
  className?: string;
}

function ImagePlaceholder({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex h-full w-full items-center justify-center bg-muted",
        className,
      )}
    >
      <FiImage className="h-10 w-10 text-muted-foreground/40" />
    </div>
  );
}

export function ImageGallery({ images, alt, className }: ImageGalleryProps) {
  const gallery = images.length > 0 ? images : [""];
  const [activeIndex, setActiveIndex] = useState(0);
  const [brokenSrcs, setBrokenSrcs] = useState<Set<string>>(new Set());

  const activeSrc = gallery[activeIndex];
  const isBroken = !activeSrc || brokenSrcs.has(activeSrc);

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="relative aspect-square w-full overflow-hidden rounded-xl border border-border bg-muted">
        {isBroken ? (
          <ImagePlaceholder />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={getImageUrl(activeSrc)}
            alt={alt}
            className="h-full w-full object-contain"
            onError={() =>
              setBrokenSrcs((prev) => new Set(prev).add(activeSrc))
            }
          />
        )}
      </div>

      {gallery.length > 1 && (
        <div className="flex gap-2 overflow-x-auto">
          {gallery.map((src, index) => {
            const thumbBroken = !src || brokenSrcs.has(src);
            return (
              <button
                key={`${src}-${index}`}
                type="button"
                onClick={() => setActiveIndex(index)}
                className={cn(
                  "relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 bg-muted transition-colors",
                  index === activeIndex
                    ? "border-primary"
                    : "border-transparent hover:border-border",
                )}
              >
                {thumbBroken ? (
                  <ImagePlaceholder />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={getImageUrl(src)}
                    alt={`${alt} - ${index + 1}`}
                    className="h-full w-full object-cover"
                    onError={() =>
                      setBrokenSrcs((prev) => new Set(prev).add(src))
                    }
                  />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
