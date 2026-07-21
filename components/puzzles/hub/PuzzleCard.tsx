import Link from "next/link";

import { cropBackground } from "@/lib/puzzles/grid";
import { difficultyConfig } from "@/lib/puzzles/types";
import type { PuzzleSummary } from "@/lib/puzzles/queries";

/**
 * One puzzle on the hub shelves. Whole card is the link (≥44px, sage focus
 * ring). The thumbnail shows the puzzle's ACTUAL crop region via the same
 * pure background math the board uses (no derivative image). Server-compatible.
 */
export default function PuzzleCard({ puzzle }: { puzzle: PuzzleSummary }) {
  const diff = difficultyConfig(puzzle.difficulty);
  const progress =
    puzzle.placedCount > 0
      ? `${puzzle.placedCount} of ${puzzle.pieces} placed`
      : puzzle.completed_count > 0
        ? "Completed — play again"
        : `${puzzle.pieces} pieces`;

  const THUMB = 64;
  const bg = puzzle.imageUrl
    ? {
        backgroundImage: `url(${puzzle.imageUrl})`,
        ...cropBackground(puzzle.crop, THUMB),
      }
    : undefined;

  return (
    <Link
      href={`/activities/puzzles/${puzzle.id}`}
      className="flex items-center gap-4 rounded-3xl border border-sand-deep/70 bg-white p-4 shadow-soft transition hover:border-primary/30 hover:shadow-soft-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <span
        aria-hidden
        style={{ width: THUMB, height: THUMB, ...bg }}
        className="shrink-0 overflow-hidden rounded-2xl bg-sand-deep/50 bg-no-repeat"
      />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="block truncate text-[17px] font-semibold text-charcoal">
            {puzzle.title || "Memory puzzle"}
          </span>
          {puzzle.favourite && (
            <span aria-label="Favourite" className="shrink-0 text-gold-ink">
              ★
            </span>
          )}
        </span>
        <span className="mt-0.5 block text-sm text-charcoal-muted">
          {diff?.label ?? puzzle.difficulty} · {progress}
        </span>
      </span>
      <span aria-hidden className="shrink-0 text-sm font-semibold text-primary">
        {puzzle.placedCount > 0 ? "Continue" : "Play"}
      </span>
    </Link>
  );
}
