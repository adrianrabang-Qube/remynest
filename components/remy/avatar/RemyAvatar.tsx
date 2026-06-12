"use client";

import { useEffect, useRef, useState } from "react";
import RemyAvatarSprite from "./RemyAvatarSprite";
import { BLUEPRINT_SRC } from "./remy-sprite-map";
import { remyAsset } from "./remy-assets";
import type { RemyMood } from "./remy-moods";

/**
 * RemyAvatar — the canonical Remy companion avatar.
 *
 *   <RemyAvatar mood="thinking" size="md" />
 *
 * Renders Remy's real artwork by cropping the correct region from the ONE
 * blueprint sprite sheet (/public/remy/remy-blueprint.png) and crossfades
 * smoothly between moods. If the sheet isn't present it shows a brand mark
 * (Remy's purple + the gold heart pendant) — never an emoji. Mobile responsive
 * via `size`. Drop the blueprint in and the real art appears everywhere.
 */
const SIZES = {
  xs: "h-6 w-6",
  sm: "h-8 w-8",
  md: "h-12 w-12",
  lg: "h-16 w-16",
  xl: "h-24 w-24",
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
  decorative?: boolean;
}) {
  // Crossfade stack: at rest one layer; a mood change fades a new layer in over
  // the previous one, which is dropped when the animation ends.
  const [stack, setStack] = useState<{ mood: RemyMood; key: number }[]>([
    { mood, key: 0 },
  ]);
  const keyRef = useRef(0);
  const [blueprintMissing, setBlueprintMissing] = useState(false);

  useEffect(() => {
    setStack((prev) => {
      const top = prev[prev.length - 1];
      if (top.mood === mood) return prev;
      keyRef.current += 1;
      return [top, { mood, key: keyRef.current }];
    });
  }, [mood]);

  const settle = (key: number) =>
    setStack((prev) =>
      prev.length > 1 && prev[prev.length - 1].key === key
        ? [prev[prev.length - 1]]
        : prev
    );

  const active = remyAsset(mood);

  return (
    <span
      data-remy-mood={mood}
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : active.alt}
      aria-hidden={decorative ? true : undefined}
      className={`relative inline-flex shrink-0 overflow-hidden rounded-full bg-[#ECE6F7] ring-2 ${active.ring} ${SIZES[size]} ${className}`}
    >
      {/* Hidden loader — detects whether the blueprint sheet is available. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={BLUEPRINT_SRC}
        alt=""
        aria-hidden="true"
        className="hidden"
        onError={() => setBlueprintMissing(true)}
      />

      {stack.map((layer, index) => {
        const isTop = index === stack.length - 1;
        const animating = isTop && stack.length > 1;
        return (
          <span
            key={layer.key}
            onAnimationEnd={() => settle(layer.key)}
            className={`absolute inset-0 ${animating ? "remy-fade-in" : ""}`}
          >
            {blueprintMissing ? (
              <BrandFallback gradient={active.gradient} />
            ) : (
              <RemyAvatarSprite mood={layer.mood} />
            )}
          </span>
        );
      })}
    </span>
  );
}

function BrandFallback({ gradient }: { gradient: string }) {
  return (
    <span
      className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${gradient}`}
    >
      <svg
        viewBox="0 0 24 24"
        className="h-1/2 w-1/2"
        aria-hidden="true"
        fill="#E3A24A"
      >
        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
      </svg>
    </span>
  );
}
