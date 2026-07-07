/**
 * Shared recurring-reminder date math.
 *
 * `nextOccurrence` is the SINGLE source of truth for "advance a recurring reminder
 * by one cadence" — previously an inline copy inside the cron. Extracting it (with
 * IDENTICAL behavior) lets the reminders-page completion action reuse it instead of
 * a second copy, so there is exactly one recurrence engine.
 *
 * NOTE: the daily/weekly/monthly arithmetic is preserved verbatim from the cron
 * (`setDate`/`setMonth` on a UTC instant). Its known DST/month-end edge behavior is
 * intentionally UNCHANGED here (that is a separate, out-of-scope defect) — this file
 * only removes duplication and adds the "advance to the next FUTURE occurrence"
 * helper the per-occurrence completion needs.
 */

export const KNOWN_FREQUENCIES = new Set(["daily", "weekly", "monthly"]);

/** Advance an ISO instant by ONE cadence step. Unknown frequency → returned unchanged. */
export function nextOccurrence(currentIso: string, frequency: string): string {
  const nextDate = new Date(currentIso);
  if (frequency === "daily") {
    nextDate.setDate(nextDate.getDate() + 1);
  }
  if (frequency === "weekly") {
    nextDate.setDate(nextDate.getDate() + 7);
  }
  if (frequency === "monthly") {
    nextDate.setMonth(nextDate.getMonth() + 1);
  }
  return nextDate.toISOString();
}

/**
 * Advance to the next occurrence STRICTLY after `after` (used when a user marks the
 * current occurrence done — the series must move forward past now, even if several
 * scheduled slots were missed). Always advances at least once so "done for today"
 * never lands back on the same instant. Bounded so an unknown/degenerate frequency
 * can never loop forever; unknown frequency returns the input unchanged.
 */
export function nextOccurrenceAfter(
  currentIso: string,
  frequency: string,
  after: Date,
): string {
  if (!KNOWN_FREQUENCIES.has(frequency)) return currentIso;
  let iso = nextOccurrence(currentIso, frequency);
  for (let i = 0; i < 1000 && new Date(iso).getTime() <= after.getTime(); i++) {
    iso = nextOccurrence(iso, frequency);
  }
  return iso;
}
