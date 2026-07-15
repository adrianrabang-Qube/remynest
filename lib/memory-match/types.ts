/**
 * Memory Match — shared types + size config (single source of truth).
 * Pure data: no React/DOM/DB. A game is a VIEW over existing photo memories:
 * each chosen photo becomes one PAIR (two cards). No timers, no scores.
 */

export interface MatchSizeConfig {
  pairs: number;
  label: string;
  /** Soft, pressure-free description shown at selection. */
  description: string;
  /** Board columns (cards = pairs × 2; rows follow). */
  cols: number;
}

/** THE size table — calm options only. Board stays tap-friendly on small phones. */
export const MATCH_SIZES: MatchSizeConfig[] = [
  { pairs: 3, label: "Cosy", description: "6 cards — a gentle start", cols: 3 },
  { pairs: 4, label: "Calm", description: "8 cards — an easy rhythm", cols: 4 },
  { pairs: 6, label: "Steady", description: "12 cards — a little longer", cols: 4 },
  { pairs: 8, label: "Full", description: "16 cards — a quiet challenge", cols: 4 },
];

export function matchSizeConfig(pairs: number): MatchSizeConfig | undefined {
  return MATCH_SIZES.find((s) => s.pairs === pairs);
}

/** One chosen photo (= one pair): the memory it belongs to + its storage path. */
export interface MatchPhoto {
  memoryId: string;
  path: string;
}

export interface MatchGameRecord {
  id: string;
  user_id: string;
  memory_profile_id: string | null;
  photos: MatchPhoto[];
  pairs: number;
  shuffle_seed: number;
  completed_count: number;
  last_played_at: string | null;
  created_at: string;
}

/** Normalize an untrusted matched-pairs payload to unique, in-range indexes. */
export function normalizeMatchedPairs(value: unknown, pairs: number): number[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<number>();
  for (const v of value) {
    if (typeof v === "number" && Number.isInteger(v) && v >= 0 && v < pairs) {
      seen.add(v);
    }
  }
  return [...seen].sort((a, b) => a - b);
}

/** Normalize an untrusted photos payload (shape only — ownership is verified server-side). */
export function normalizeMatchPhotos(value: unknown): MatchPhoto[] {
  if (!Array.isArray(value)) return [];
  const out: MatchPhoto[] = [];
  for (const v of value) {
    const p = v as Record<string, unknown> | null;
    if (
      p &&
      typeof p.memoryId === "string" &&
      p.memoryId &&
      typeof p.path === "string" &&
      p.path
    ) {
      out.push({ memoryId: p.memoryId, path: p.path });
    }
    if (out.length > 8) break;
  }
  return out;
}
