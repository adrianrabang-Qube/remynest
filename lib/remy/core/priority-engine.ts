/**
 * Remy Platform (v2) — PRIORITY ENGINE (pure).
 *
 * The Insights Engine can surface several observations at once; this decides which SINGLE one (if
 * any) Remy shows — the "maximum one proactive behaviour at a time, no spam" rule. It deduplicates
 * by kind, drops observations still within their cooldown (behavioural memory), and ranks the rest
 * by urgency then importance. PURE: no React/DOM/DB/timers. `now` + `cooldowns` are supplied by the
 * caller (from the persistence layer) so the engine stays deterministic and testable.
 */
import type { RankableMoment } from "./family-types";

export interface PriorityMemory {
  /** Last-shown timestamp (ms) per observation kind — the cooldown ledger. */
  cooldowns: Record<string, number>;
  /** Current time (ms). Supplied by the caller (never read from a clock here). */
  now: number;
}

/**
 * Pick at most ONE moment to show now, or null. Generic over any `RankableMoment` (an insights
 * `Observation` or a `RelationshipObservation`) so the single selection rule is shared — no
 * duplicated logic.
 */
export function selectMoment<T extends RankableMoment>(
  observations: T[],
  memory: PriorityMemory,
): T | null {
  // Dedupe by kind (keep the first occurrence).
  const seen = new Set<string>();
  const unique = observations.filter((o) => {
    if (seen.has(o.kind)) return false;
    seen.add(o.kind);
    return true;
  });

  // Drop anything still cooling down.
  const eligible = unique.filter((o) => {
    const last = memory.cooldowns[o.kind];
    return last == null || memory.now - last >= o.cooldownMs;
  });
  if (eligible.length === 0) return null;

  // Rank: urgency first (time-sensitive wins), then importance.
  eligible.sort((a, b) => b.urgency - a.urgency || b.importance - a.importance);
  return eligible[0];
}
