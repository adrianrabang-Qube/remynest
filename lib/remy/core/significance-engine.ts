/**
 * Remy Platform (v2) — SIGNIFICANCE ENGINE (pure).
 *
 * Ranks memories by EMOTIONAL SIGNIFICANCE — NOT recency, NOT creation order. Signals (all real,
 * caller-supplied): the people involved, whether a favourite person is involved, whether today is
 * the memory's anniversary, how large a life chapter it belongs to, its media richness, its AI
 * importance, and whether the family revisits it — plus future-compatible pinning / conversation
 * references (empty until those features exist; never fabricated). Pure: no React/DOM/DB/timers.
 */
import type { DatedMemory, SignificantMemory } from "./family-types";

export interface SignificanceContext {
  favouritePersonIds: ReadonlySet<string>;
  anniversaryMemoryIds: ReadonlySet<string>;
  revisitedMemoryIds: ReadonlySet<string>;
  chapterSizeByMemoryId: ReadonlyMap<string, number>;
  /** Graph connectivity — how many memory-graph edges a memory has (more connected = more significant). Optional. */
  connectionCountByMemoryId?: ReadonlyMap<string, number>;
  /** Journey significance (0–100) — a memory that belongs to a meaningful life journey is more significant. Optional. */
  journeyImportanceByMemoryId?: ReadonlyMap<string, number>;
  /** Future-compatible — empty today (a manual "pin" feature / conversation references). */
  pinnedMemoryIds?: ReadonlySet<string>;
  conversationMemoryIds?: ReadonlySet<string>;
}

/** The significance score for a single memory (higher = more significant). Deterministic. */
export function scoreMemorySignificance(m: DatedMemory, ctx: SignificanceContext): number {
  const people = m.peopleIds ?? [];
  let score = 0;
  score += Math.min(24, people.length * 6); // people involved
  score += people.some((p) => ctx.favouritePersonIds.has(p)) ? 12 : 0; // a favourite person
  score += ctx.anniversaryMemoryIds.has(m.id) ? 15 : 0; // its anniversary is today
  score += Math.min(18, ctx.chapterSizeByMemoryId.get(m.id) ?? 0); // chapter importance
  score += Math.min(20, (m.attachmentCount ?? 0) * 4); // media richness
  score += Math.min(20, Math.max(0, m.importance ?? 0) / 5); // AI importance (0–100 → up to 20)
  score += ctx.revisitedMemoryIds.has(m.id) ? 12 : 0; // the family returns to it
  score += Math.min(15, (ctx.connectionCountByMemoryId?.get(m.id) ?? 0) * 2); // graph connectivity
  score += Math.min(12, (ctx.journeyImportanceByMemoryId?.get(m.id) ?? 0) / 8); // part of a life journey
  score += ctx.pinnedMemoryIds?.has(m.id) ? 25 : 0; // manually pinned (future)
  score += ctx.conversationMemoryIds?.has(m.id) ? 8 : 0; // referenced in conversation (future)
  return score;
}

/** Rank memories most-significant-first. */
export function rankSignificantMemories(
  memories: DatedMemory[],
  ctx: SignificanceContext,
): SignificantMemory[] {
  return memories
    .map((m) => ({ id: m.id, title: m.title, dateIso: m.dateIso, score: scoreMemorySignificance(m, ctx) }))
    .sort((a, b) => b.score - a.score);
}
