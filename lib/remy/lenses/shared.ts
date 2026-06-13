import type { CoverageLevel, DecadeBucket } from "./types";

/** Pure helpers shared across lenses. Deterministic, no I/O, no AI. */

export function cap(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function coverageLevel(
  memoryCount: number,
  percentage: number,
): CoverageLevel {
  if (memoryCount < 3) return "new";
  if (memoryCount < 25) return "sparse";
  if (memoryCount <= 60) return "moderate";
  return percentage >= 50 ? "rich" : "moderate";
}

export function monthsSince(iso: string, now: Date): number {
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return 0;
  const ms = now.getTime() - then.getTime();
  return Math.max(0, Math.round(ms / (1000 * 60 * 60 * 24 * 30)));
}

/** Earliest decade with zero memories within the subject's plausible lifespan. */
export function findGapDecade(
  decades: DecadeBucket[],
  birthYear: number | null,
  now: Date,
): number | null {
  if (decades.length === 0) return null;
  const present = new Set(decades.map((d) => d.decade));
  const start =
    birthYear != null ? Math.floor(birthYear / 10) * 10 : decades[0].decade;
  const end = Math.floor(now.getFullYear() / 10) * 10;
  for (let decade = start; decade <= end; decade += 10) {
    if (!present.has(decade)) return decade;
  }
  return null;
}
