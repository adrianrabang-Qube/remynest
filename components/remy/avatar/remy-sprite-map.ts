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
  // In-App Usage row (named interaction busts)
  listening: { x: 0.02, y: 0.79, w: 0.11, h: 0.105 },
  thinking: { x: 0.15, y: 0.785, w: 0.11, h: 0.11 },
  analyzing: { x: 0.28, y: 0.785, w: 0.11, h: 0.11 },
  sharing: { x: 0.41, y: 0.79, w: 0.11, h: 0.105 },
  celebrating: { x: 0.535, y: 0.78, w: 0.12, h: 0.12 },
  welcoming: { x: 0.86, y: 0.785, w: 0.11, h: 0.11 },
  // Expressions grid
  neutral: { x: 0.835, y: 0.2, w: 0.15, h: 0.13 },
  reflecting: { x: 0.835, y: 0.34, w: 0.15, h: 0.13 },
  // Poses & Actions
  resting: { x: 0.78, y: 0.63, w: 0.11, h: 0.11 },
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
