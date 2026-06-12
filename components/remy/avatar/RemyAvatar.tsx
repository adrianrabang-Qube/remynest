import Image from "next/image";
import { remyAsset } from "./remy-assets";
import type { RemyMood } from "./remy-moods";

/**
 * RemyAvatar — the canonical Remy companion avatar.
 *
 *   <RemyAvatar mood="thinking" size="md" />
 *
 * Renders the official blueprint art for a mood when present, otherwise a
 * brand-styled fallback (Remy's purple palette + the mood's expression). The
 * single component every surface mounts (header, notifications, story mode,
 * biography, family, future native/voice) — swapping in the official art is a
 * one-line change in remy-assets.ts. Mobile responsive via `size`.
 */
const SIZES = {
  xs: "h-6 w-6 text-sm",
  sm: "h-8 w-8 text-base",
  md: "h-12 w-12 text-xl",
  lg: "h-16 w-16 text-2xl",
  xl: "h-24 w-24 text-4xl",
} as const;

export type RemyAvatarSize = keyof typeof SIZES;

export default function RemyAvatar({
  mood = "neutral",
  size = "md",
  className = "",
  decorative = false,
}: {
  mood?: RemyMood;
  size?: RemyAvatarSize;
  className?: string;
  /** When true, the avatar is purely decorative (aria-hidden). */
  decorative?: boolean;
}) {
  const asset = remyAsset(mood);

  return (
    <span
      data-remy-mood={mood}
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : asset.alt}
      aria-hidden={decorative ? true : undefined}
      className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br ring-2 ${asset.gradient} ${asset.ring} ${SIZES[size]} ${className}`}
    >
      {asset.src ? (
        <Image
          src={asset.src}
          alt={asset.alt}
          fill
          unoptimized
          className="object-cover"
        />
      ) : (
        <span aria-hidden="true" className="leading-none">
          {asset.glyph}
        </span>
      )}
    </span>
  );
}
