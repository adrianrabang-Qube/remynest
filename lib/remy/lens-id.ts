/**
 * LensId — the five perspectives Remy understands a life through.
 *
 * Kept in its own dependency-free module so both the base Remy types
 * (types.ts → RemyObservation.lensId) and the lens layer (lenses/types.ts)
 * can reference it without an import cycle.
 */
export type LensId =
  | "life-journey"
  | "themes"
  | "relationships"
  | "story"
  | "preservation";
