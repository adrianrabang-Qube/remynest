"use client";

import Image from "next/image";
import { useState } from "react";
import { Play } from "lucide-react";

export type GalleryAttachment = {
  url?: string;
  /** Untransformed signed URL — used if the transformed `url` fails to load. */
  fallbackUrl?: string;
  type?: string; // "image" | "video" | "audio" | "document" | "file"
  name?: string;
  filename?: string;
  mimeType?: string;
};

const FALLBACK =
  "data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%23f3f4f6'/%3E%3C/svg%3E";

/**
 * Single attachment thumbnail — the type-dispatch SEAM for future media.
 * Today: image -> next/image (lazy, unoptimized for signed URLs, onError fallback);
 * video/audio/document/file -> a neutral typed placeholder. Adding a real
 * video/audio/pdf thumbnail later is a new branch here, NOT a gallery redesign.
 * `fill`-based, so the parent must be `relative` + sized.
 */
export default function MediaThumb({
  attachment,
  alt,
  sizes,
}: {
  attachment: GalleryAttachment;
  alt?: string;
  sizes?: string;
}) {
  // 0 = transformed url · 1 = untransformed fallbackUrl · 2 = placeholder.
  const [stage, setStage] = useState(0);
  const type = attachment.type || "file";
  const label =
    alt || attachment.name || attachment.filename || "Attachment";

  if (type === "image" && attachment.url) {
    const src =
      stage === 0
        ? attachment.url
        : stage === 1 && attachment.fallbackUrl
          ? attachment.fallbackUrl
          : FALLBACK;
    return (
      <Image
        src={src}
        alt={label}
        fill
        unoptimized
        loading="lazy"
        sizes={sizes ?? "200px"}
        onError={() =>
          setStage((s) => (s === 0 && attachment.fallbackUrl ? 1 : 2))
        }
        className="object-cover"
      />
    );
  }

  // Video → a play-indicator tile (poster support can later read attachment
  // thumbnailUrl here without changing callers).
  if (type === "video") {
    return (
      <div className="flex h-full w-full items-center justify-center bg-gray-800">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-black/40 backdrop-blur-sm">
          <Play className="h-5 w-5 fill-white text-white" aria-label="Video" />
        </span>
      </div>
    );
  }

  // Voice Memory v1: audio gets a compact branded chip instead of the generic
  // gray badge (presentation only — the placeholder contract is unchanged).
  if (type === "audio") {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-1 bg-sand px-2 text-center">
        <span
          aria-hidden
          className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-sage shadow-soft"
        >
          ♪
        </span>
        <span className="text-xs font-medium text-charcoal-soft">
          Voice memory
        </span>
      </div>
    );
  }

  const badge = type === "document" ? "PDF / Doc" : "File";

  return (
    <div className="flex h-full w-full items-center justify-center bg-gray-100 px-2 text-center text-xs font-medium text-gray-600">
      {badge}
    </div>
  );
}
