import {
  REMY_MOODS,
  REMY_MOOD_SPECS,
  type RemyMood,
} from "./remy-moods";

/**
 * Remy avatar presentation metadata (a11y + ring/fallback styling).
 *
 * The artwork itself comes from the single blueprint sprite sheet via
 * `remy-sprite-map.ts` (cropped per mood). This module no longer references
 * per-mood PNGs — it only carries the alt text, ring accent, and the gradient
 * used by the brand fallback when the sheet is absent.
 */
export interface RemyAvatarAsset {
  mood: RemyMood;
  alt: string;
  /** Tailwind gradient (Remy's purple palette) — used by the brand fallback. */
  gradient: string;
  /** Tailwind ring accent — gold for celebration/sharing, purple otherwise. */
  ring: string;
}

const BASE_GRADIENT = "from-[#8A6BD0] to-[#5B3E8E]";

const RING_BY_MOOD: Partial<Record<RemyMood, string>> = {
  celebrating: "ring-[#E3A24A]/70",
  sharing: "ring-[#E3A24A]/50",
  resting: "ring-[#8A6BD0]/30",
};

function buildAssets(): Record<RemyMood, RemyAvatarAsset> {
  const assets = {} as Record<RemyMood, RemyAvatarAsset>;
  for (const mood of REMY_MOODS) {
    assets[mood] = {
      mood,
      alt: `Remy — ${REMY_MOOD_SPECS[mood].label}`,
      gradient: BASE_GRADIENT,
      ring: RING_BY_MOOD[mood] ?? "ring-[#7C5CBF]/40",
    };
  }
  return assets;
}

export const REMY_ASSETS: Record<RemyMood, RemyAvatarAsset> = buildAssets();

export function remyAsset(mood: RemyMood): RemyAvatarAsset {
  return REMY_ASSETS[mood] ?? REMY_ASSETS.neutral;
}
