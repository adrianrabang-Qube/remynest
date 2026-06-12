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
  welcoming: { x: 0.846, y: 0.79, w: 0.1, h: 0.1 },
  // Expressions grid (right column) — larger 0.17² because the faces are drawn
  // bigger on the sheet (keeps the head the same size as the busts in-avatar).
  neutral: { x: 0.817, y: 0.175, w: 0.17, h: 0.17 },
  reflecting: { x: 0.821, y: 0.307, w: 0.17, h: 0.17 },
  // Poses & Actions — head of the sitting pose, 0.12² (excludes the feet).
  resting: { x: 0.792, y: 0.57, w: 0.12, h: 0.12 },
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
