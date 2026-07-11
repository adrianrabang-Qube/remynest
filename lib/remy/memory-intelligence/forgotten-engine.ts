/**
 * Memory Intelligence V2 — FORGOTTEN-MEMORY DETECTION (pure, deterministic, INTERNAL ONLY, NO UI).
 *
 * Detects memories that have never been recalled, become stale, or lost significance, so a FUTURE surface can
 * resurface them. Pinned/favourite memories are intentionally excluded (they are deliberately kept). Bounded +
 * deterministically ordered. The caller supplies `now`; no IO, no clock.
 */
import { FORGOTTEN_CONFIG } from "./config";
import { ageDaysOf } from "./math";
import type { ForgottenMemory, MemoryIntelligenceState } from "./types";

export interface ForgottenCandidate {
  memoryId: string;
  dateIso: string | null;
  state: MemoryIntelligenceState;
  /** The memory's current 0..1 importance (post-decay) from the engine. */
  importance: number;
}

/**
 * Detect forgotten memories. A candidate is forgotten when it matches ANY reason:
 *  - never_recalled: retrievalCount === 0 AND older than `neverRecalledAgeDays`
 *  - stale: last recalled more than `staleAfterDays` ago
 *  - lost_significance: importance below `lostSignificanceBelow`
 * Ordered most-forgotten first (lowest importance, then oldest), capped at `maxResults`.
 */
export function detectForgottenMemories(
  candidates: ForgottenCandidate[],
  now: number,
): ForgottenMemory[] {
  const out: ForgottenMemory[] = [];

  for (const c of candidates) {
    // Never flag a deliberately-kept memory as forgotten.
    if (c.state.pinned || c.state.favourite) continue;

    const ageDays = ageDaysOf(c.dateIso, now);
    const reasons: ForgottenMemory["reasons"] = [];

    if (c.state.retrievalCount === 0 && ageDays > FORGOTTEN_CONFIG.neverRecalledAgeDays) {
      reasons.push("never_recalled");
    }
    if (c.state.lastRecalledAt) {
      const sinceRecall = ageDaysOf(c.state.lastRecalledAt, now);
      if (sinceRecall > FORGOTTEN_CONFIG.staleAfterDays) reasons.push("stale");
    }
    if (c.importance < FORGOTTEN_CONFIG.lostSignificanceBelow) {
      reasons.push("lost_significance");
    }

    if (reasons.length > 0) {
      out.push({ memoryId: c.memoryId, reasons, ageDays, importance: c.importance });
    }
  }

  return out
    .sort((a, b) => a.importance - b.importance || b.ageDays - a.ageDays || a.memoryId.localeCompare(b.memoryId))
    .slice(0, FORGOTTEN_CONFIG.maxResults);
}
