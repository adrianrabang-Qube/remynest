import {
  REMY_MOODS,
  REMY_MOOD_SPECS,
  type RemyMood,
} from "./remy-moods";

/**
 * Remy avatar assets — the binding between a mood and its real artwork.
 *
 * `src` points at the OFFICIAL blueprint export for the mood:
 *   /public/remy/remy-<mood>.png  (square bust, transparent background)
 *
 * RemyAvatar renders this artwork. If an export is not yet present it falls back
 * to a brand mark (Remy's purple + the gold heart pendant) — never an emoji. To
 * add or update Remy's art, drop the PNGs in /public/remy; no code change needed.
 */
export interface RemyAvatarAsset {
  mood: RemyMood;
  /** Official artwork path (square bust PNG, transparent background). */
  src: string;
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
    const spec = REMY_MOOD_SPECS[mood];
    assets[mood] = {
      mood,
      src: `/remy/remy-${mood}.png`,
      alt: `Remy — ${spec.label}`,
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
