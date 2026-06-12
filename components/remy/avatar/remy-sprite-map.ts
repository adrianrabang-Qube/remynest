import type { CSSProperties } from "react";
import type { RemyMood } from "./remy-moods";

/**
 * Remy Blueprint Sprite Sheet — one canonical source image, cropped per mood.
 *
 *   Blueprint image → Sprite Map → RemyAvatarSprite → RemyAvatar
 *
 * Replaces the per-mood PNG approach: every mood is a crop region of the single
 * official blueprint. Regions are NORMALIZED (fractions 0–1 of the image), so
 * they're resolution-independent and easy to recalibrate without touching code.
 * No DB, no queries, no AI.
 */
export const BLUEPRINT_SRC = "/remy/remy-blueprint.png";

export interface SpriteRegion {
  /** Left edge, fraction of image width (0–1). */
  x: number;
  /** Top edge, fraction of image height (0–1). */
  y: number;
  /** Region width, fraction of image width (0–1). */
  w: number;
  /** Region height, fraction of image height (0–1). */
  h: number;
}

/**
 * Mood → crop region, calibrated against the blueprint layout:
 *   • In-App Usage row (bottom): the named busts — listening, thinking,
 *     analyzing, sharing, celebrating, and the Chatting bust (welcoming).
 *   • Expressions grid (top-right): neutral, reflecting (thoughtful).
 *   • Poses & Actions (mid-right): resting (eyes closed).
 * Tune these fractions if the official export's framing differs.
 */
export const REMY_SPRITE_MAP: Record<RemyMood, SpriteRegion> = {
  // In-App Usage busts — tight 0.10² head crop centered on each measured head
  // centroid; top y 0.79 sits below stars/accessories, bottom 0.89 above labels.
  // Consistent framing: head ≈ 60% of the crop across all of these.
  listening: { x: 0.025, y: 0.79, w: 0.1, h: 0.1 },
  thinking: { x: 0.158, y: 0.79, w: 0.1, h: 0.1 },
  analyzing: { x: 0.287, y: 0.79, w: 0.1, h: 0.1 },
  sharing: { x: 0.417, y: 0.79, w: 0.1, h: 0.1 },
  celebrating: { x: 0.553, y: 0.79, w: 0.1, h: 0.1 },
  // Re-measured: the Chatting bird is x[0.871-0.962]; crop starts at 0.868 to
  // drop the purple speech-bubble blob (x ≤ 0.868) and center on the bird.
  welcoming: { x: 0.868, y: 0.796, w: 0.1, h: 0.1 },
  // Expressions grid right column — re-measured face bands: neutral = row2
  // y[0.207-0.335], reflecting = row3 y[0.346-0.475]. 0.145² fully contains each
  // bust (head top → pendant) with no clipping or row-above bleed.
  neutral: { x: 0.832, y: 0.199, w: 0.145, h: 0.145 },
  reflecting: { x: 0.835, y: 0.338, w: 0.145, h: 0.145 },
  // Poses & Actions — the resting (eyes-closed) sprite is row2-middle
  // y[0.671-0.751], x≈[0.78-0.87]; 0.085² frames its head+scarf+pendant.
  resting: { x: 0.783, y: 0.658, w: 0.085, h: 0.085 },
};

/** Inline style that crops a mood's region from the blueprint to fill a box. */
export function remySpriteStyle(mood: RemyMood): CSSProperties {
  const region = REMY_SPRITE_MAP[mood] ?? REMY_SPRITE_MAP.neutral;
  const denomW = region.w >= 1 ? 0 : 1 - region.w;
  const denomH = region.h >= 1 ? 0 : 1 - region.h;
  return {
    backgroundImage: `url(${BLUEPRINT_SRC})`,
    backgroundRepeat: "no-repeat",
    backgroundSize: `${100 / region.w}% ${100 / region.h}%`,
    backgroundPosition: `${denomW <= 0 ? 0 : (region.x / denomW) * 100}% ${
      denomH <= 0 ? 0 : (region.y / denomH) * 100
    }%`,
  };
}
