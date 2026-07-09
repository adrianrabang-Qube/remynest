/**
 * Remy Platform (v2) — MOMENT GATE.
 *
 * A tiny process-wide mutex so that AT MOST ONE proactive Remy moment chip is on screen at a time
 * across the separate companion surfaces (RemyMoments' daily nudges + RemyRelationship's long-term
 * moments). Each surface calls `tryBeginMoment()` before showing and `endMoment()` when it hides;
 * whichever asks first wins, the other stays quiet. Not platform state — just a UI presentation lock
 * (no React, no store), so there is no duplicated state and the "one proactive behaviour at a time"
 * rule holds globally.
 */
let active = false;

export function tryBeginMoment(): boolean {
  if (active) return false;
  active = true;
  return true;
}

export function endMoment(): void {
  active = false;
}

export function isMomentActive(): boolean {
  return active;
}
