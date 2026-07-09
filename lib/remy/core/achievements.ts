/**
 * Remy Platform (v2) — ACHIEVEMENTS / MILESTONES (pure).
 *
 * Given a user's REAL memory count moving from `prev` → `next`, which milestones did they just
 * cross? Memory-count thresholds (first memory, 10/50/100/500/1000) plus Nest-evolution
 * stage-ups. Pure + deterministic — the surface (`RemyMilestones`) reads a persisted last-count,
 * calls this, and emits a `milestone.reached` event per crossing (which the celebration surface
 * turns into a feather-burst celebration). No retroactive celebration: a first-ever load only
 * baselines the count (see the surface).
 */
import { resolveNestStage, nestStageLabel } from "./nest";

export interface Milestone {
  id: string;
  label: string;
}

const COUNT_MILESTONES: readonly { count: number; id: string; label: string }[] = [
  { count: 1, id: "first-memory", label: "Your first memory" },
  { count: 10, id: "memories-10", label: "10 memories saved" },
  { count: 50, id: "memories-50", label: "50 memories saved" },
  { count: 100, id: "memories-100", label: "100 memories saved" },
  { count: 500, id: "memories-500", label: "500 memories saved" },
  { count: 1000, id: "memories-1000", label: "1,000 memories saved" },
];

/** Milestones crossed moving from `prevCount` → `nextCount` (count thresholds + a Nest stage-up). */
export function crossedMilestones(prevCount: number, nextCount: number): Milestone[] {
  if (nextCount <= prevCount) return [];
  const crossed: Milestone[] = [];

  for (const m of COUNT_MILESTONES) {
    if (prevCount < m.count && nextCount >= m.count) {
      crossed.push({ id: m.id, label: m.label });
    }
  }

  const prevStage = resolveNestStage(prevCount);
  const nextStage = resolveNestStage(nextCount);
  if (prevStage !== nextStage) {
    crossed.push({
      id: `nest-${nextStage}`,
      label: `Your Nest grew to ${nestStageLabel(nextStage)}`,
    });
  }

  return crossed;
}
