/**
 * Remy Platform (v2) — INSIGHTS ENGINE (pure behavioural intelligence).
 *
 * Given a snapshot of the user's situation, produce a list of behavioural OBSERVATIONS — things
 * Remy would naturally notice ("no memories yet today", "you have reminders today", "your Nest
 * grew"). PURE: no React, no DOM, no database queries, no timers. The caller gathers the snapshot
 * (server data + client persistence) and passes it in; the Priority Engine then picks at most one.
 *
 * This is NOT AI chat and NOT notifications — it is deterministic, rule-based intelligence that
 * extends the ONE platform (alongside the emotion/policy engines). Each rule is data-driven: when
 * the relevant data is absent the rule simply produces nothing. Every observation names an existing
 * `RemyBehavior` so it renders through the one `<Remy>` renderer.
 */
import type { RemyBehavior } from "./behavior";
import type { NestStage } from "./nest";
import { nestStageLabel } from "./nest";
import type { TimeOfDay } from "./time-of-day";

export type ObservationKind =
  | "morning-greeting"
  | "evening-farewell"
  | "first-visit-today"
  | "returning-after-days"
  | "long-inactivity"
  | "reminders-due-today"
  | "all-reminders-completed"
  | "reminders-completed-today"
  | "memories-this-week"
  | "no-memories-today"
  | "nest-evolved"
  | "birthday-tomorrow";

export interface Observation {
  kind: ObservationKind;
  /** The short line Remy shows. */
  message: string;
  /** How Remy looks while showing it (an existing platform behaviour). */
  behavior: RemyBehavior;
  /** Base significance 0–100. */
  importance: number;
  /** Time-sensitivity 0–100 (ranked before importance). */
  urgency: number;
  /** Minimum gap before this KIND may show again (ms). */
  cooldownMs: number;
}

/** An upcoming person date (birthday/anniversary). Optional input — wired when a source exists. */
export interface UpcomingDate {
  name: string;
  /** Days from today (1 = tomorrow). */
  inDays: number;
}

/** Everything the engine reasons over. Gathered by the caller; the engine never queries. */
export interface CompanionSnapshot {
  isMyNest: boolean;
  memoryCount: number;
  memoriesToday: number;
  memoriesThisWeek: number;
  remindersDueToday: number;
  remindersCompletedToday: number;
  todaysReminderTotal: number;
  nestStage: NestStage;
  timeOfDay: TimeOfDay;
  /** True on the first visit of the calendar day (drives greeting/farewell). */
  firstVisitToday: boolean;
  /** Whole days since the last visit; null on the first-ever visit. */
  daysSinceLastVisit: number | null;
  /** The Nest stage the user has already been shown (to detect a fresh evolution). */
  acknowledgedStage: NestStage | null;
  /** Optional: upcoming person dates (empty until a birthday source is wired). */
  upcomingDates?: UpcomingDate[];
}

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

/** Derive the behavioural observations for a snapshot (unordered; the priority engine ranks them). */
export function deriveObservations(s: CompanionSnapshot): Observation[] {
  const out: Observation[] = [];

  // --- Greeting / farewell — only on the first visit of the day (never per navigation) ---
  if (s.firstVisitToday) {
    if (s.timeOfDay === "morning") {
      out.push(mk("morning-greeting", "Good morning.", "greeting", 40, 30, DAY));
    } else if (s.timeOfDay === "evening" || s.timeOfDay === "night") {
      out.push(mk("evening-farewell", "Good evening.", "greeting", 38, 28, DAY));
    } else {
      out.push(mk("first-visit-today", "Welcome back.", "greeting", 35, 26, DAY));
    }
  }

  // --- Returning after time away ---
  if (s.daysSinceLastVisit != null && s.daysSinceLastVisit >= 7) {
    out.push(mk("long-inactivity", "It's been a while — your memories are right here.", "greeting", 60, 46, 3 * DAY));
  } else if (s.daysSinceLastVisit != null && s.daysSinceLastVisit >= 3) {
    out.push(mk("returning-after-days", "Welcome back — it's been a few days.", "greeting", 50, 40, DAY));
  }

  // --- Upcoming dates (data-driven; nothing fires while upcomingDates is empty) ---
  for (const d of s.upcomingDates ?? []) {
    if (d.inDays === 1) {
      out.push(mk("birthday-tomorrow", `${d.name}'s birthday is tomorrow.`, "reminder", 75, 85, DAY));
    }
  }

  // --- Reminders ---
  if (s.remindersDueToday > 0) {
    const n = s.remindersDueToday;
    out.push(
      mk(
        "reminders-due-today",
        n === 1 ? "You have a reminder today." : `You have ${n} reminders today.`,
        "reminder",
        70,
        80,
        6 * HOUR,
      ),
    );
  } else if (s.todaysReminderTotal > 0 && s.remindersCompletedToday > 0) {
    out.push(mk("all-reminders-completed", "You completed every reminder today.", "celebrating", 55, 50, DAY));
  }
  if (s.remindersCompletedToday >= 3) {
    out.push(mk("reminders-completed-today", `${s.remindersCompletedToday} reminders done today — lovely.`, "success", 45, 34, DAY));
  }

  // --- Memories ---
  if (s.memoriesThisWeek >= 5) {
    out.push(mk("memories-this-week", `You've added ${s.memoriesThisWeek} memories this week.`, "memoryFound", 46, 30, 2 * DAY));
  } else if (s.memoryCount > 0 && s.memoriesToday === 0 && !s.firstVisitToday) {
    out.push(mk("no-memories-today", "No memories yet today — anything worth keeping?", "greeting", 30, 22, DAY));
  }

  // --- Nest evolution (a stage the user hasn't been shown yet) ---
  if (s.acknowledgedStage != null && s.acknowledgedStage !== s.nestStage) {
    out.push(mk("nest-evolved", `Your Nest grew to ${nestStageLabel(s.nestStage)}.`, "celebrating", 65, 55, DAY));
  }

  return out;
}

function mk(
  kind: ObservationKind,
  message: string,
  behavior: RemyBehavior,
  importance: number,
  urgency: number,
  cooldownMs: number,
): Observation {
  return { kind, message, behavior, importance, urgency, cooldownMs };
}
