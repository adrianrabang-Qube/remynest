/**
 * Shared Reminder Focus model.
 *
 * The single source of truth for "what matters now" — consumed today by the
 * Dashboard, and designed to be the same model the Reminder Center and the
 * future (Sprint 2+) status-based Focus engine consume. Pure + side-effect free
 * so it runs anywhere; call it CLIENT-side so day bucketing uses the user's
 * local timezone (reminders are stored UTC).
 *
 * Forward-compatible: reads the optional lifecycle `status` when present and
 * falls back to the legacy `completed` boolean until the lifecycle migration is
 * live. No lifecycle/cron behavior is implied here — this is read/derive only.
 */
export type FocusReminder = {
  id: string;
  title: string;
  remind_at: string | null;
  completed?: boolean | null;
  recurring?: boolean | null;
  frequency?: string | null;
  completed_at?: string | null;
  /** Lifecycle status (Sprint 2+); falls back to `completed` when absent. */
  status?: string | null;
};

const RESOLVED_STATUSES = new Set(["completed", "skipped"]);

export function isResolved(r: FocusReminder): boolean {
  if (r.status) return RESOLVED_STATUSES.has(r.status);
  return Boolean(r.completed);
}

export function isActive(r: FocusReminder): boolean {
  return !isResolved(r);
}

function sameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

const byRemindAtAsc = (a: FocusReminder, b: FocusReminder) =>
  new Date(a.remind_at as string).getTime() -
  new Date(b.remind_at as string).getTime();

export interface DashboardFocusModel {
  /** The single most pressing action right now (oldest overdue, else next). */
  rightNow: FocusReminder | null;
  overdue: FocusReminder[];
  upcomingToday: FocusReminder[];
  routines: FocusReminder[];
  summary: {
    todayTotal: number;
    overdue: number;
    upcomingToday: number;
    completedToday: number;
    routines: number;
  };
}

/**
 * Derive the dashboard focus buckets from a flat reminder list, in LOCAL time.
 */
export function deriveDashboardFocus(
  reminders: FocusReminder[],
  now: Date = new Date()
): DashboardFocusModel {
  const list = Array.isArray(reminders) ? reminders : [];
  const active = list.filter(isActive);

  const oneOff = active.filter((r) => !r.recurring && r.remind_at);
  const routines = active.filter((r) => r.recurring);

  const overdue = oneOff
    .filter((r) => new Date(r.remind_at as string) < now)
    .sort(byRemindAtAsc);

  const upcomingToday = oneOff
    .filter((r) => {
      const d = new Date(r.remind_at as string);
      return d >= now && sameLocalDay(d, now);
    })
    .sort(byRemindAtAsc);

  const upcomingFuture = oneOff
    .filter((r) => {
      const d = new Date(r.remind_at as string);
      return d >= now && !sameLocalDay(d, now);
    })
    .sort(byRemindAtAsc);

  // "Right now" = the most urgent overdue (longest waiting), else the next thing
  // due today, else the next future item.
  const rightNow =
    overdue[0] ?? upcomingToday[0] ?? upcomingFuture[0] ?? null;

  const completedToday = list.filter((r) => {
    if (!isResolved(r)) return false;
    const ca = r.completed_at ? new Date(r.completed_at) : null;
    return ca != null && sameLocalDay(ca, now);
  }).length;

  return {
    rightNow,
    overdue,
    upcomingToday,
    routines,
    summary: {
      todayTotal: overdue.length + upcomingToday.length,
      overdue: overdue.length,
      upcomingToday: upcomingToday.length,
      completedToday,
      routines: routines.length,
    },
  };
}
