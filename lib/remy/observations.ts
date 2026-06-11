import type { RemyObservation, RemySignals, RemySurface } from "./types";
import { TONE_MOOD, remyVoice } from "./persona";

const DAY_MS = 86_400_000;
const STALE_AFTER_DAYS = 14;

/**
 * Turn read-only signals into ranked, human observations.
 *
 * Pure + deterministic — no side effects, no AI call, no schema dependency.
 * This is Remy's "mind"; the companion component is Remy's "face". Adding a new
 * observation is just a new rule here, and it instantly works on every surface
 * and (later) through the avatar.
 */
export function generateRemyObservations(
  signals: RemySignals,
  surface: RemySurface = "dashboard"
): RemyObservation[] {
  const v = remyVoice(signals.subjectName, signals.isCareContext);
  const m = signals.memories;
  const r = signals.reminders;
  const w = signals.workspace;

  const out: RemyObservation[] = [];

  const add = (
    id: string,
    priority: number,
    tone: RemyObservation["tone"],
    text: string,
    cta?: RemyObservation["cta"]
  ) => {
    out.push({
      id,
      surface,
      tone,
      mood: TONE_MOOD[tone],
      priority,
      text,
      cta,
    });
  };

  // ── Onboarding — no memories yet ──────────────────────────────────────────
  if (m.total === 0) {
    add(
      "memory-first",
      90,
      "encouraging",
      `${v.subject} ${v.hasHave} no memories yet — let's capture the first one together.`,
      { label: "Add a memory", href: "/memories/new" }
    );
  }

  // ── Reminders that have slipped — gentle, never alarming ───────────────────
  if (r.overdue > 0) {
    add(
      "reminders-overdue",
      80,
      "gentle",
      `${r.overdue} reminder${r.overdue === 1 ? " is" : "s are"} waiting a little longer than planned. No rush — whenever the moment feels right.`,
      { label: "Open reminders", href: "/reminders" }
    );
  }

  // ── What's on today ────────────────────────────────────────────────────────
  if (r.today > 0) {
    add(
      "reminders-today",
      70,
      "informative",
      `${v.subject} ${v.hasHave} ${r.today} reminder${r.today === 1 ? "" : "s"} scheduled today.`,
      { label: "View today", href: "/reminders" }
    );
  } else if (r.routines > 0) {
    add(
      "reminders-clear",
      35,
      "reassuring",
      `Everything's set for today — ${r.routines} routine${r.routines === 1 ? "" : "s"} running quietly in the background.`
    );
  }

  // ── Celebrate what's been done ─────────────────────────────────────────────
  if (r.completedToday > 0) {
    add(
      "reminders-done",
      60,
      "celebratory",
      `${v.subject} completed ${r.completedToday} reminder${r.completedToday === 1 ? "" : "s"} today. Lovely momentum.`
    );
  }

  // ── Memory activity this week ──────────────────────────────────────────────
  if (m.addedThisWeek > 0) {
    add(
      "memory-week",
      55,
      "encouraging",
      `${m.addedThisWeek} new ${m.addedThisWeek === 1 ? "memory was" : "memories were"} added this week.`,
      { label: "Open memories", href: "/memories" }
    );
  }

  // ── Month-over-month momentum ──────────────────────────────────────────────
  if (m.addedThisMonth > m.addedLastMonth && m.addedThisMonth > 0) {
    add(
      "memory-trend",
      50,
      "celebratory",
      `Memory activity is up this month — ${m.addedThisMonth} so far, compared with ${m.addedLastMonth} last month.`
    );
  }

  // ── Gentle nudge when things have gone quiet ───────────────────────────────
  if (m.total > 0 && m.addedThisWeek === 0) {
    const stale = m.lastAddedAt
      ? Date.now() - new Date(m.lastAddedAt).getTime() > STALE_AFTER_DAYS * DAY_MS
      : true;
    if (stale) {
      add(
        "memory-stale",
        45,
        "gentle",
        `No new memories have been added recently. A small moment is always worth keeping.`,
        { label: "Capture a moment", href: "/memories/new" }
      );
    }
  }

  // ── Caregiver context ──────────────────────────────────────────────────────
  if (w.pendingInvites > 0) {
    add(
      "invites",
      40,
      "informative",
      `${w.pendingInvites} caregiver invite${w.pendingInvites === 1 ? " is" : "s are"} waiting for a response.`,
      { label: "Review invites", href: "/dashboard" }
    );
  }

  // ── Calm presence — Remy is always here ────────────────────────────────────
  if (out.length === 0) {
    add(
      "presence",
      10,
      "reassuring",
      `I'm keeping an eye on things. Everything looks calm right now.`
    );
  }

  return out.sort((a, b) => b.priority - a.priority);
}
