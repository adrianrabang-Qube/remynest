"use client";

import Image from "next/image";
import { useState } from "react";

type MemoryCoverImageProps = {
  src: string;
  alt: string;
  className?: string;
};

const MEMORY_COVER_FALLBACK =
  "data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 320 240'%3E%3Crect width='320' height='240' fill='%23f3f4f6'/%3E%3Ctext x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-family='Arial, sans-serif' font-size='18' fill='%236b7280'%3EImage unavailable%3C/text%3E%3C/svg%3E";

export default function MemoryCoverImage({
  src,
  alt,
  className,
}: MemoryCoverImageProps) {
  const [imgSrc, setImgSrc] = useState(src);

  return (
    <Image
      key={src}
      src={imgSrc}
      alt={alt}
      width={1}
      height={1}
      unoptimized
      onError={() => setImgSrc(MEMORY_COVER_FALLBACK)}
      className={className}
    />
  );
}
