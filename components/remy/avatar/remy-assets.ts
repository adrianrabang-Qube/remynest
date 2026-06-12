import {
  REMY_MOODS,
  REMY_MOOD_SPECS,
  type RemyMood,
} from "./remy-moods";

/**
 * Remy avatar assets — the binding between a mood and its rendered art.
 *
 * `src` points at the OFFICIAL blueprint export for the mood and is null until
 * the exports are placed in `/public/remy/remy-<mood>.png`. Until then the
 * avatar renders a brand-styled fallback (Remy's purple palette + the mood's
 * expression glyph). When the official art lands, set `src` here — no other
 * change is required anywhere Remy is mounted.
 */
export interface RemyAvatarAsset {
  mood: RemyMood;
  /** Official blueprint PNG path, or null while pending. */
  src: string | null;
  alt: string;
  /** Fallback expression glyph (placeholder for the official art). */
  glyph: string;
  /** Tailwind gradient (Remy's purple palette, per the blueprint). */
  gradient: string;
  /** Tailwind ring accent — gold for celebration, purple otherwise. */
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
      // Official blueprint exports pending — fallback renders until provided.
      src: null,
      alt: `Remy — ${spec.label}`,
      glyph: spec.expression,
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
