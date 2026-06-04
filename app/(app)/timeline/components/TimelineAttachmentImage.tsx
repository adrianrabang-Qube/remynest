"use client";

import Image from "next/image";
import { useState } from "react";

const IMAGE_ATTACHMENT_FALLBACK =
  "data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 320 240'%3E%3Crect width='320' height='240' fill='%23f3f4f6'/%3E%3Ctext x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-family='Arial, sans-serif' font-size='18' fill='%236b7280'%3EImage unavailable%3C/text%3E%3C/svg%3E";

type TimelineAttachmentImageProps = {
  src: string;
  alt: string;
};

export default function TimelineAttachmentImage({
  src,
  alt,
}: TimelineAttachmentImageProps) {
  const [imgSrc, setImgSrc] =
    useState(src);

  return (
    <Image
      key={src}
      src={imgSrc}
      alt={alt}
      width={48}
      height={48}
      unoptimized
      onError={() => {
        setImgSrc(
          IMAGE_ATTACHMENT_FALLBACK
        );
      }}
      className="h-12 w-12 rounded-2xl object-cover border border-gray-200"
    />
  );
}
