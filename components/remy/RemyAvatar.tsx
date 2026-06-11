import type { RemyMood } from "@/lib/remy/types";

/**
 * Remy's avatar — the forward-compatible plug-in point.
 *
 * Today this renders a calm, mood-aware mark. The future animated / 3D Remy
 * avatar replaces ONLY this component's internals while keeping the exact same
 * props (`mood`, `size`), so every surface that already mounts <RemyCompanion>
 * gains the avatar with zero changes to the engine or call sites.
 */
const MOOD_RING: Record<RemyMood, string> = {
  happy: "from-sage/35 to-gold/30",
  calm: "from-sage/25 to-sage/10",
  thoughtful: "from-sage/20 to-sand-deep/40",
  attentive: "from-sage/35 to-sage/15",
};

const SIZES = {
  sm: "h-9 w-9 text-base",
  md: "h-12 w-12 text-xl",
  lg: "h-16 w-16 text-2xl",
} as const;

export default function RemyAvatar({
  mood = "calm",
  size = "md",
}: {
  mood?: RemyMood;
  size?: keyof typeof SIZES;
}) {
  return (
    <div
      aria-hidden="true"
      data-remy-mood={mood}
      className={`relative inline-flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br ring-1 ring-sage/20 ${MOOD_RING[mood]} ${SIZES[size]}`}
    >
      <span className="font-semibold text-sage-deep">✦</span>
    </div>
  );
}
