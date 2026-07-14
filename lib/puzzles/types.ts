/**
 * Memory Puzzles — shared types + difficulty config (single source of truth).
 * Pure data: no React/DOM/DB. Copy stays non-clinical (LA1/LA5): estimates are
 * soft invitations ("about 5 minutes, no rush"), never timers or targets.
 */

export type PuzzleDifficulty =
  | "gentle"
  | "easy"
  | "medium"
  | "challenging"
  | "expert";

export interface DifficultyConfig {
  id: PuzzleDifficulty;
  label: string;
  pieces: number;
  /** Soft, pressure-free estimate shown at selection. */
  estimate: string;
}

/** THE difficulty table — pieces per level and the soft estimate. */
export const DIFFICULTIES: DifficultyConfig[] = [
  { id: "gentle", label: "Gentle", pieces: 9, estimate: "about 5 minutes" },
  { id: "easy", label: "Easy", pieces: 16, estimate: "about 10 minutes" },
  { id: "medium", label: "Medium", pieces: 36, estimate: "about 20 minutes" },
  { id: "challenging", label: "Challenging", pieces: 64, estimate: "about 40 minutes" },
  { id: "expert", label: "Expert", pieces: 100, estimate: "an hour or more" },
];

export function difficultyConfig(
  id: string | null | undefined,
): DifficultyConfig | undefined {
  return DIFFICULTIES.find((d) => d.id === id);
}

/**
 * Square crop captured at create time, in SOURCE-IMAGE PIXELS plus the natural
 * dimensions — so tile background math is exact at any render size, with no
 * percentage-positioning ambiguity and no derivative image.
 */
export interface PuzzleCrop {
  x: number;
  y: number;
  side: number;
  naturalWidth: number;
  naturalHeight: number;
}

export interface PuzzleRecord {
  id: string;
  user_id: string;
  memory_profile_id: string | null;
  memory_id: string | null;
  image_path: string;
  title: string;
  crop: PuzzleCrop;
  pieces: number;
  difficulty: PuzzleDifficulty;
  shuffle_seed: number;
  favourite: boolean;
  completed_count: number;
  last_played_at: string | null;
  created_at: string;
}

export interface PuzzleProgressRecord {
  puzzle_id: string;
  /** Piece indexes already placed (pieces snap only to their correct slot). */
  placements: number[];
  placed_count: number;
  updated_at: string;
}

/** Validate an untrusted crop payload (server-side guard on create). */
export function isValidCrop(value: unknown): value is PuzzleCrop {
  if (typeof value !== "object" || value === null) return false;
  const c = value as Record<string, unknown>;
  const nums = [c.x, c.y, c.side, c.naturalWidth, c.naturalHeight];
  if (!nums.every((n) => typeof n === "number" && Number.isFinite(n))) return false;
  const { x, y, side, naturalWidth, naturalHeight } = c as unknown as PuzzleCrop;
  return (
    naturalWidth > 0 &&
    naturalHeight > 0 &&
    side > 0 &&
    x >= 0 &&
    y >= 0 &&
    x + side <= naturalWidth + 1 && // +1: tolerate rounding from client math
    y + side <= naturalHeight + 1
  );
}
