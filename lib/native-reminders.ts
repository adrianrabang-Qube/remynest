/**
 * Native iOS local-notification scheduling for RemyNest reminders.
 *
 * RemyNest ships as a remote-URL Capacitor app and reminder CRUD is server-side, so
 * notifications cannot be scheduled from the server. Instead this CLIENT-SIDE engine
 * RECONCILES the device's scheduled local notifications against the current reminder
 * list whenever the reminders screen renders. Delivery is then entirely on-device via
 * UNUserNotificationCenter — no cron, no APNs, no OneSignal round-trip; it works
 * offline and the scheduled notifications survive app restarts/reboots (the OS holds
 * them). Recurring reminders use a calendar trigger that the OS re-evaluates each
 * cycle (DST/timezone-safe); one-time reminders use an interval trigger computed at
 * schedule time and kept fresh by reconcile-on-render.
 *
 * OneSignal stays in place for everything else (shared-memory alerts, AI updates,
 * collaboration, account events). This module owns REMINDER delivery on native iOS only.
 */
import { Capacitor } from "@capacitor/core";
import {
  LocalNotifications,
  type Schedule,
} from "@capacitor/local-notifications";

export type LocalReminder = {
  id: string;
  title: string | null;
  remind_at: string; // UTC ISO instant
  recurring: boolean | null;
  frequency: string | null; // "daily" | "weekly" | "monthly"
  completed: boolean | null;
};

const KNOWN_FREQUENCIES = new Set(["daily", "weekly", "monthly"]);

// A one-time reminder must be comfortably in the future to be scheduled: this covers
// async scheduling latency (permission prompt + bridge hops) and prevents the native
// plugin from rejecting the schedule call when an `at` has slipped into the past.
const ONE_TIME_MIN_LEAD_MS = 60_000;

// In-session memo (notificationId -> content signature) so editing/completing ONE
// reminder does not cancel + reschedule ALL of them across the native bridge.
const scheduledSignatures = new Map<number, string>();

/** Local notifications are scheduled only inside the native iOS shell. */
export function isNativeReminderTarget(): boolean {
  return (
    typeof window !== "undefined" &&
    Capacitor.isNativePlatform() &&
    Capacitor.getPlatform() === "ios"
  );
}

/**
 * Deterministic UUID -> positive 31-bit integer (FNV-1a over the FULL id). Capacitor
 * local-notification ids are integers; a stable id means an edit cancels + replaces the
 * same notification and a delete cancels exactly the right one. Hashing the whole UUID
 * (not just a prefix) uses all of its entropy.
 */
export function reminderNotificationId(reminderId: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < reminderId.length; i++) {
    h ^= reminderId.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h & 0x7fffffff) || 1;
}

async function ensurePermission(): Promise<boolean> {
  const check = await LocalNotifications.checkPermissions();
  if (check.display === "granted") return true;
  const req = await LocalNotifications.requestPermissions();
  return req.display === "granted";
}

function isRecurring(r: LocalReminder): boolean {
  return Boolean(
    r.recurring && r.frequency && KNOWN_FREQUENCIES.has(r.frequency),
  );
}

/** Schedulable = not completed AND (a known recurring cadence OR a sufficiently-future instant). */
function isSchedulable(r: LocalReminder): boolean {
  if (r.completed) return false;
  if (isRecurring(r)) return true;
  return (
    new Date(r.remind_at).getTime() > Date.now() + ONE_TIME_MIN_LEAD_MS
  );
}

/**
 * Build the schedule. Recurring -> calendar components in the device's LOCAL time, which
 * iOS re-evaluates each cycle (UNCalendarNotificationTrigger) — DST/timezone-safe.
 * Monthly is clamped to day <= 28 so it fires every month (the OS skips, not clamps,
 * a missing day like the 31st). One-time -> interval trigger from the absolute instant.
 */
function buildSchedule(r: LocalReminder): Schedule {
  const d = new Date(r.remind_at);
  if (isRecurring(r)) {
    const hour = d.getHours();
    const minute = d.getMinutes();
    if (r.frequency === "weekly") {
      // iOS weekday: 1=Sunday..7=Saturday; JS getDay(): 0=Sunday..6=Saturday.
      return { on: { weekday: d.getDay() + 1, hour, minute } };
    }
    if (r.frequency === "monthly") {
      // Clamp 29-31 to the 28th so the reminder fires in every month.
      return { on: { day: Math.min(d.getDate(), 28), hour, minute } };
    }
    return { on: { hour, minute } }; // daily
  }
  return { at: d };
}

/** Content that, if changed, requires the notification to be re-scheduled. */
function contentSignature(r: LocalReminder): string {
  return [
    r.remind_at,
    r.recurring ? 1 : 0,
    r.frequency ?? "",
    r.title ?? "",
  ].join("|");
}

function toNotification(r: LocalReminder) {
  return {
    id: reminderNotificationId(r.id),
    title: "RemyNest Reminder",
    body: r.title || "Reminder",
    schedule: buildSchedule(r),
    extra: { reminderId: r.id },
  };
}

/**
 * Reconcile the device's scheduled local notifications against the current reminder
 * list: cancel notifications whose reminder was deleted / completed / expired, and
 * (re)schedule only NEW or CHANGED reminders — so create, edit, delete and complete all
 * take effect through one idempotent, low-churn diff with no per-action hooks.
 * Notifications are scheduled per-item so one near-boundary `at` cannot drop the rest.
 * Best-effort: never throws into the reminders UI.
 */
export async function reconcileLocalReminders(
  reminders: LocalReminder[],
): Promise<void> {
  if (!isNativeReminderTarget()) return;
  try {
    const granted = await ensurePermission();
    if (!granted) return;

    const desired = reminders.filter(isSchedulable);
    const desiredIds = new Set(
      desired.map((r) => reminderNotificationId(r.id)),
    );

    // 1) Cancel notifications no longer wanted. RemyNest is the only source of local
    //    notifications, so any pending id not in the desired set is stale.
    const pending = await LocalNotifications.getPending();
    const stale = pending.notifications
      .filter((n) => !desiredIds.has(n.id))
      .map((n) => ({ id: n.id }));
    if (stale.length) {
      await LocalNotifications.cancel({ notifications: stale });
      for (const n of stale) scheduledSignatures.delete(n.id);
    }
    const pendingIds = new Set(pending.notifications.map((n) => n.id));

    // 2) Schedule only NEW or CHANGED reminders (skip unchanged ones to avoid churn).
    //    Per-item so a single rejected entry cannot drop the whole batch.
    for (const r of desired) {
      const id = reminderNotificationId(r.id);
      const sig = contentSignature(r);
      const isPending = pendingIds.has(id);
      if (isPending && scheduledSignatures.get(id) === sig) continue;
      try {
        if (isPending) {
          await LocalNotifications.cancel({ notifications: [{ id }] });
        }
        await LocalNotifications.schedule({
          notifications: [toNotification(r)],
        });
        scheduledSignatures.set(id, sig);
      } catch {
        // a single near-boundary one-time can be rejected; skip it, keep the rest
      }
    }
  } catch {
    // best-effort; on-device scheduling must never break the reminders screen
  }
}
