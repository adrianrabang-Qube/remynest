"use client";

import { useState } from "react";
import MediaThumb, {
  type GalleryAttachment,
} from "@/components/memories/MediaThumb";
import PhotoViewer from "@/components/memories/PhotoViewer";

/**
 * Detail-page photo gallery: a horizontal CSS scroll-snap strip of the memory's
 * images (swipe left/right with native momentum), each tappable to open the
 * full-screen PhotoViewer at that index. Mobile-first, lazy, no image library.
 * Non-image attachments are rendered separately by the detail page.
 */
export default function MemoryGallery({
  images,
  thumbnails,
}: {
  images: GalleryAttachment[];
  /** Small thumb-variant URLs (same order as images) for the viewer's strip. */
  thumbnails?: string[];
}) {
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  if (images.length === 0) return null;

  const viewerImages = images.map((a) => ({
    url: a.url ?? "",
    name: a.name ?? a.filename,
    type: a.type,
    fallbackUrl: a.fallbackUrl,
  }));

  const frame =
    "relative shrink-0 snap-center overflow-hidden rounded-3xl border border-gray-100 bg-gray-100";

  return (
    <>
      {images.length === 1 ? (
        <button
          type="button"
          onClick={() => setViewerIndex(0)}
          className={`${frame} block aspect-[4/3] w-full`}
        >
          <MediaThumb
            attachment={images[0]}
            sizes="(max-width:768px) 100vw, 700px"
          />
        </button>
      ) : (
        <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain pb-2 [-webkit-overflow-scrolling:touch]">
          {images.map((a, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setViewerIndex(i)}
              className={`${frame} aspect-[4/3] w-[80%] sm:w-[48%]`}
            >
              <MediaThumb
                attachment={a}
                sizes="(max-width:768px) 80vw, 350px"
              />
            </button>
          ))}
        </div>
      )}

      {viewerIndex !== null ? (
        <PhotoViewer
          images={viewerImages}
          thumbnails={thumbnails}
          startIndex={viewerIndex}
          onClose={() => setViewerIndex(null)}
        />
      ) : null}
    </>
  );
}
