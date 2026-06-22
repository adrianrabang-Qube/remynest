"use client";

import Image from "next/image";
import { useState } from "react";

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

  const badge =
    type === "video"
      ? "▶ Video"
      : type === "audio"
        ? "♪ Audio"
        : type === "document"
          ? "PDF / Doc"
          : "File";

  return (
    <div className="flex h-full w-full items-center justify-center bg-gray-100 px-2 text-center text-xs font-medium text-gray-600">
      {badge}
    </div>
  );
}
