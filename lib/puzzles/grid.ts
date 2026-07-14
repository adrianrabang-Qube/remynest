import type { PuzzleCrop } from "./types";

/**
 * Memory Puzzles — PURE grid/board math (no React/DOM/DB/clock/randomness
 * beyond the SEEDED shuffle). The engine renders every piece as a DOM tile
 * whose background is the ONE shared source image (sprite technique — a single
 * decode for the whole board); these helpers own all of that arithmetic.
 */

/** Piece counts are perfect squares (schema-checked): 9|16|36|64|100. */
export function gridForPieces(pieces: number): { cols: number; rows: number } {
  const side = Math.round(Math.sqrt(pieces));
  return { cols: side, rows: side };
}

/** Deterministic PRNG (mulberry32) — the stored seed reproduces the tray order. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Seeded Fisher–Yates: the tray order for `pieces` pieces. Deterministic per seed. */
export function shuffledTrayOrder(pieces: number, seed: number): number[] {
  const order = Array.from({ length: pieces }, (_, i) => i);
  const rand = mulberry32(seed);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

/**
 * Exact background geometry for one tile, in CSS pixels, for a board rendered
 * at `boardPx` square. Pixel-unit background-position (never %) so there is no
 * container-relative ambiguity: scale = screen px per source px of the crop.
 */
export function tileBackground(
  crop: PuzzleCrop,
  cols: number,
  index: number,
  boardPx: number,
): {
  backgroundSize: string;
  backgroundPosition: string;
} {
  const col = index % cols;
  const row = Math.floor(index / cols);
  const tilePx = boardPx / cols;
  const srcTile = crop.side / cols; // source px per tile
  const scale = tilePx / srcTile; // screen px per source px
  const originX = (crop.x + col * srcTile) * scale;
  const originY = (crop.y + row * srcTile) * scale;
  return {
    backgroundSize: `${crop.naturalWidth * scale}px ${crop.naturalHeight * scale}px`,
    backgroundPosition: `${-originX}px ${-originY}px`,
  };
}

/** The whole-crop background (ghost outline / completion photo) at boardPx. */
export function cropBackground(
  crop: PuzzleCrop,
  boardPx: number,
): { backgroundSize: string; backgroundPosition: string } {
  const scale = boardPx / crop.side;
  return {
    backgroundSize: `${crop.naturalWidth * scale}px ${crop.naturalHeight * scale}px`,
    backgroundPosition: `${-crop.x * scale}px ${-crop.y * scale}px`,
  };
}

/** Normalize an untrusted placements payload to unique, in-range piece indexes. */
export function normalizePlacements(value: unknown, pieces: number): number[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<number>();
  for (const v of value) {
    if (typeof v === "number" && Number.isInteger(v) && v >= 0 && v < pieces) {
      seen.add(v);
    }
  }
  return [...seen].sort((a, b) => a - b);
}
