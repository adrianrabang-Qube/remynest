"use client";

import MediaThumb, {
  type GalleryAttachment,
} from "@/components/memories/MediaThumb";

/**
 * Facebook-style condensed multi-attachment preview for memory feed cards:
 *   1  -> single
 *   2  -> side-by-side
 *   3  -> one tall + two stacked
 *   4+ -> 2x2 grid with a "+N" tile
 * Display-only (the card is a <Link> to the detail gallery). Decodes at most 4
 * lazy thumbnails regardless of album size (perf). Renders nothing when empty.
 */
export default function MemoryGalleryPreview({
  attachments,
}: {
  attachments: GalleryAttachment[] | undefined | null;
}) {
  const items = (attachments ?? []).filter(
    (a) => a && (a.url || a.type)
  );
  if (items.length === 0) return null;

  const tile = "relative overflow-hidden rounded-xl bg-gray-100";

  if (items.length === 1) {
    return (
      <div className={`${tile} mb-3 aspect-[4/3]`}>
        <MediaThumb
          attachment={items[0]}
          sizes="(max-width:768px) 100vw, 600px"
        />
      </div>
    );
  }

  if (items.length === 2) {
    return (
      <div className="mb-3 grid grid-cols-2 gap-1.5">
        {items.map((a, i) => (
          <div key={i} className={`${tile} aspect-square`}>
            <MediaThumb attachment={a} sizes="50vw" />
          </div>
        ))}
      </div>
    );
  }

  if (items.length === 3) {
    return (
      <div className="mb-3 grid aspect-square grid-cols-2 grid-rows-2 gap-1.5">
        <div className={`${tile} row-span-2`}>
          <MediaThumb attachment={items[0]} sizes="50vw" />
        </div>
        <div className={tile}>
          <MediaThumb attachment={items[1]} sizes="50vw" />
        </div>
        <div className={tile}>
          <MediaThumb attachment={items[2]} sizes="50vw" />
        </div>
      </div>
    );
  }

  // 4+
  const shown = items.slice(0, 4);
  const extra = items.length - 4;
  return (
    <div className="mb-3 grid grid-cols-2 gap-1.5">
      {shown.map((a, i) => (
        <div key={i} className={`${tile} aspect-square`}>
          <MediaThumb attachment={a} sizes="50vw" />
          {i === 3 && extra > 0 ? (
            <div className="absolute inset-0 flex items-center justify-center bg-black/55 text-xl font-semibold text-white">
              +{extra}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}
