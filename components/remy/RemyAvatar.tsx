import Remy, { type RemyVariant } from "@/components/remy/Remy";
import type { RemyMood } from "@/lib/remy/types";

/**
 * Remy's avatar — the forward-compatible plug-in point.
 *
 * 2026-07-21 (design-bible polish): the placeholder sparkle mark was replaced with the REAL
 * approved Remy character, drawn through the single `<Remy>` renderer (avatar tier — the
 * square 256×256 export; the path still lives only in the asset registry). Exactly the
 * upgrade this seam was designed for: the props (`mood`, `size`, `className`) are unchanged,
 * so every surface that mounts this component gained the character with zero call-site
 * changes. A future animated / Rive avatar still replaces only these internals.
 */
const MOOD_EXPRESSION: Record<RemyMood, RemyVariant> = {
  happy: "happy",
  calm: "idle",
  thoughtful: "thinking",
  attentive: "listening",
};

/** Soft companion-toned halo behind the transparent character art. */
const MOOD_RING: Record<RemyMood, string> = {
  happy: "from-remy-lavender/25 to-remy-gold/20",
  calm: "from-remy-lavender/20 to-remy-lavender/5",
  thoughtful: "from-remy-lavender/20 to-remy-mist",
  attentive: "from-remy-lavender/30 to-remy-lavender/10",
};

const SIZES = {
  sm: "h-9 w-9 text-base",
  md: "h-12 w-12 text-xl",
  lg: "h-16 w-16 text-2xl",
} as const;

/** Intrinsic px per size — the renderer's `sizes` hint; the box itself is class-driven. */
const SIZE_PX: Record<keyof typeof SIZES, number> = { sm: 36, md: 48, lg: 64 };

export default function RemyAvatar({
  mood = "calm",
  size = "md",
  className = "",
}: {
  mood?: RemyMood;
  size?: keyof typeof SIZES;
  /** Optional extra classes (e.g. responsive size overrides). */
  className?: string;
}) {
  return (
    <div
      aria-hidden="true"
      data-remy-mood={mood}
      className={`relative inline-flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br ring-1 ring-remy-lavender/20 ${MOOD_RING[mood]} ${SIZES[size]} ${className}`}
    >
      {/* `!h-full !w-full` lets the class-driven box (incl. responsive overrides passed via
          `className`) control the rendered size over the renderer's inline px box. */}
      <Remy
        state={MOOD_EXPRESSION[mood]}
        assetVariant="avatar"
        size={SIZE_PX[size]}
        className="!h-full !w-full"
        decorative
      />
    </div>
  );
}
