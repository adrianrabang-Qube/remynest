"use client";

/**
 * Reminder Center V2 (Phase 1 — experience layer).
 *
 * Restructures the flat reminder list into a calm, hierarchical center and
 * renders every time in the USER'S LOCAL TIMEZONE (this is a client component,
 * so `toLocaleString` uses the browser tz — reminders are stored UTC and shown
 * local; users never see UTC).
 *
 * Forward-compatible with Reminder Center V2 Phase 2: it already reads optional
 * `priority` / `pinned` / `sent` fields and renders Priority/Pinned/lifecycle
 * states when the schema migration adds them (graceful empty until then).
 */

import { useMemo, useState } from "react";

export type ReminderRecord = {
  id: string;
  title: string;
  remind_at: string | null;
  created_at?: string | null;
  completed?: boolean | null;
  sent?: boolean | null;
  recurring?: boolean | null;
  frequency?: string | null;
  // Phase-2 (optional until migration applied)
  priority?: "critical" | "important" | "general" | string | null;
  pinned?: boolean | null;
};

type ServerAction = (formData: FormData) => void | Promise<void>;

interface Props {
  reminders: ReminderRecord[];
  careProfileName?: string | null;
  toggleAction: ServerAction;
  deleteAction: ServerAction;
}

// ---- local-time formatting (browser tz) ------------------------------------
const fmtTime = (iso?: string | null) =>
  iso
    ? new Date(iso).toLocaleTimeString(undefined, {
        hour: "numeric",
        minute: "2-digit",
      })
    : "";

const fmtDateTime = (iso?: string | null) =>
  iso
    ? new Date(iso).toLocaleString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : "Unknown";

const startOfDay = (d: Date) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate());

const daysBetween = (a: Date, b: Date) =>
  Math.round((startOfDay(a).getTime() - startOfDay(b).getTime()) / 86400000);

// ---- lifecycle state (decoupled from delivery) -----------------------------
type LifecycleState = "completed" | "awaiting" | "scheduled";

function lifecycle(r: ReminderRecord): LifecycleState {
  if (r.completed) return "completed";
  if (r.sent) return "awaiting"; // notified, awaiting user confirmation (Phase 2 cron)
  return "scheduled";
}

const PRIORITY_META: Record<
  string,
  { dot: string; label: string }
> = {
  critical: { dot: "bg-rose-500", label: "Critical" },
  important: { dot: "bg-gold", label: "Important" },
  general: { dot: "bg-sage-soft", label: "General" },
};

function StateChip({ state }: { state: LifecycleState }) {
  const map = {
    completed: "bg-sage-soft/25 text-sage-deep",
    awaiting: "bg-gold/15 text-[#9c7e3f]",
    scheduled: "bg-sand-deep/60 text-charcoal-soft",
  } as const;
  const label = {
    completed: "Completed",
    awaiting: "Awaiting confirmation",
    scheduled: "Scheduled",
  } as const;
  return (
    <span className={`text-xs px-2.5 py-1 rounded-full ${map[state]}`}>
      {label[state]}
    </span>
  );
}

function ReminderCard({
  r,
  toggleAction,
  deleteAction,
  showDate = true,
}: {
  r: ReminderRecord;
  toggleAction: ServerAction;
  deleteAction: ServerAction;
  showDate?: boolean;
}) {
  const state = lifecycle(r);
  const overdue =
    state !== "completed" &&
    r.remind_at != null &&
    new Date(r.remind_at) < new Date() &&
    !r.recurring;
  const pri =
    r.priority && PRIORITY_META[r.priority]
      ? PRIORITY_META[r.priority]
      : null;

  return (
    <div className="rounded-3xl border border-sand-deep/70 bg-white p-5 shadow-soft transition hover:shadow-soft-lg">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {pri && (
              <span
                className={`h-2.5 w-2.5 rounded-full ${pri.dot}`}
                title={pri.label}
              />
            )}
            {r.pinned && <span title="Pinned">⭐</span>}
            <h3 className="font-semibold text-lg text-charcoal truncate">
              {r.title}
            </h3>
          </div>

          <p
            className={`text-sm mt-1.5 ${
              overdue ? "text-rose-600/90 font-medium" : "text-charcoal-muted"
            }`}
          >
            {overdue ? "Overdue · " : ""}
            {showDate ? fmtDateTime(r.remind_at) : fmtTime(r.remind_at)}
          </p>

          {r.recurring && r.frequency && (
            <p className="text-sm text-sage mt-1">
              ↻ Repeats {r.frequency}
            </p>
          )}
        </div>

        <div className="flex flex-col items-end gap-2 shrink-0">
          <StateChip state={state} />
          <div className="flex items-center gap-2">
            <form action={toggleAction}>
              <input type="hidden" name="id" value={r.id} />
              <input
                type="hidden"
                name="completed"
                value={String(Boolean(r.completed))}
              />
              <button
                type="submit"
                className={`text-xs px-3 py-1 rounded-full transition ${
                  r.completed
                    ? "border border-sand-deep text-charcoal-soft hover:bg-sand-deep/40"
                    : "bg-sage text-white hover:bg-sage-deep"
                }`}
              >
                {r.completed
                  ? "Reopen"
                  : r.recurring && r.frequency
                    ? "Done for today"
                    : "Mark complete"}
              </button>
            </form>
            <form action={deleteAction}>
              <input type="hidden" name="id" value={r.id} />
              <button
                type="submit"
                className="text-xs px-3 py-1 rounded-full bg-rose-50 text-rose-600/90 hover:bg-rose-100 transition"
                aria-label="Delete reminder"
              >
                Delete
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  hint,
  count,
  children,
}: {
  title: string;
  hint?: string;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-10">
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="text-xl font-semibold text-charcoal">{title}</h2>
        {typeof count === "number" && (
          <span className="text-sm text-charcoal-muted">{count}</span>
        )}
      </div>
      {hint && <p className="text-sm text-charcoal-muted -mt-2 mb-3">{hint}</p>}
      <div className="space-y-3">{children}</div>
    </section>
  );
}

const EmptyHint = ({ text }: { text: string }) => (
  <div className="rounded-3xl border border-dashed border-sand-deep/70 bg-white/50 p-6 text-center text-sm text-charcoal-muted">
    {text}
  </div>
);

export default function ReminderCenter({
  reminders,
  careProfileName,
  toggleAction,
  deleteAction,
}: Props) {
  const [showCompleted, setShowCompleted] = useState(false);

  const groups = useMemo(() => {
    const now = new Date();
    const active = reminders.filter((r) => !r.completed);
    const completed = reminders
      .filter((r) => r.completed)
      .sort(
        (a, b) =>
          new Date(b.remind_at ?? b.created_at ?? 0).getTime() -
          new Date(a.remind_at ?? a.created_at ?? 0).getTime()
      );

    const routines = active.filter((r) => r.recurring);
    const oneOff = active
      .filter((r) => !r.recurring && r.remind_at)
      .sort(
        (a, b) =>
          new Date(a.remind_at!).getTime() - new Date(b.remind_at!).getTime()
      );

    const overdue: ReminderRecord[] = [];
    const today: ReminderRecord[] = [];
    const tomorrow: ReminderRecord[] = [];
    const thisWeek: ReminderRecord[] = [];
    const later: ReminderRecord[] = [];

    for (const r of oneOff) {
      const d = new Date(r.remind_at!);
      const diff = daysBetween(d, now);
      if (d < now && diff <= 0) overdue.push(r);
      else if (diff === 0) today.push(r);
      else if (diff === 1) tomorrow.push(r);
      else if (diff <= 7) thisWeek.push(r);
      else later.push(r);
    }

    const pinned = active.filter((r) => r.pinned);
    const byPriority = (p: string) =>
      active.filter((r) => r.priority === p);

    const nextUp = [...today, ...tomorrow, ...thisWeek, ...later].find(
      (r) => new Date(r.remind_at!) >= now
    );

    return {
      overdue,
      today,
      tomorrow,
      thisWeek,
      later,
      routines,
      completed,
      pinned,
      critical: byPriority("critical"),
      important: byPriority("important"),
      nextUp,
      todayCount: overdue.length + today.length,
      hasPriority: active.some((r) => r.priority),
    };
  }, [reminders]);

  const card = (r: ReminderRecord, showDate = true) => (
    <ReminderCard
      key={r.id}
      r={r}
      toggleAction={toggleAction}
      deleteAction={deleteAction}
      showDate={showDate}
    />
  );

  return (
    <div>
      {/* SECTION 1 — TODAY'S FOCUS (hero) */}
      <section className="rounded-[28px] border border-sand-deep/70 bg-gradient-to-b from-sage/[0.06] to-white p-7 shadow-soft">
        <div className="flex items-center justify-between">
          <div className="text-xs font-medium uppercase tracking-wider text-charcoal-muted">
            Today&apos;s Focus
          </div>
          <div className="text-sm text-charcoal-muted">
            {groups.todayCount} today
            {groups.overdue.length > 0 && (
              <span className="text-rose-600/90">
                {" "}· {groups.overdue.length} overdue
              </span>
            )}
          </div>
        </div>

        {groups.nextUp ? (
          <div className="mt-3">
            <p className="text-sm text-charcoal-muted">Next up</p>
            <h2 className="text-3xl font-semibold text-charcoal mt-1">
              {groups.nextUp.title}
            </h2>
            <p className="text-lg text-sage-deep mt-1">
              {fmtDateTime(groups.nextUp.remind_at)}
            </p>
          </div>
        ) : (
          <p className="mt-3 text-charcoal-soft">
            Nothing scheduled next — you&apos;re all caught up. 🌿
          </p>
        )}

        {(groups.overdue.length > 0 || groups.today.length > 0) && (
          <div className="mt-5 space-y-3">
            {groups.overdue.map((r) => card(r))}
            {groups.today.map((r) => card(r))}
          </div>
        )}
      </section>

      {/* SECTION 4 — PRIORITY (forward-compatible; appears once `priority` exists) */}
      {groups.hasPriority && (
        <Section title="Priority" hint="Reminders that need extra attention.">
          {groups.critical.map((r) => card(r))}
          {groups.important.map((r) => card(r))}
        </Section>
      )}

      {/* SECTION 5 — PINNED (forward-compatible; appears once `pinned` exists) */}
      {groups.pinned.length > 0 && (
        <Section title="⭐ Pinned" count={groups.pinned.length}>
          {groups.pinned.map((r) => card(r))}
        </Section>
      )}

      {/* SECTION 2 — UPCOMING */}
      <Section title="Upcoming" hint="Organised by time horizon.">
        {groups.tomorrow.length === 0 &&
        groups.thisWeek.length === 0 &&
        groups.later.length === 0 ? (
          <EmptyHint text="No upcoming reminders." />
        ) : (
          <>
            {groups.tomorrow.length > 0 && (
              <>
                <p className="text-xs font-medium uppercase tracking-wider text-charcoal-muted pt-1">
                  Tomorrow
                </p>
                {groups.tomorrow.map((r) => card(r))}
              </>
            )}
            {groups.thisWeek.length > 0 && (
              <>
                <p className="text-xs font-medium uppercase tracking-wider text-charcoal-muted pt-2">
                  This week
                </p>
                {groups.thisWeek.map((r) => card(r))}
              </>
            )}
            {groups.later.length > 0 && (
              <>
                <p className="text-xs font-medium uppercase tracking-wider text-charcoal-muted pt-2">
                  Later
                </p>
                {groups.later.map((r) => card(r))}
              </>
            )}
          </>
        )}
      </Section>

      {/* SECTION 3 — DAILY ROUTINES */}
      <Section
        title="Daily Routines"
        hint="Recurring reminders that anchor the day."
        count={groups.routines.length}
      >
        {groups.routines.length > 0 ? (
          groups.routines.map((r) => card(r, false))
        ) : (
          <EmptyHint text="No recurring routines yet. Create a recurring reminder to build one." />
        )}
      </Section>

      {/* SECTION 6 — CAREGIVER TASKS (always a care workspace here) */}
      {careProfileName && (
        <p className="mt-10 text-sm text-charcoal-muted">
          You&apos;re viewing the care reminders for{" "}
          <span className="font-medium text-charcoal">{careProfileName}</span>.
        </p>
      )}

      {/* SECTION 7 — COMPLETED HISTORY */}
      <Section title="Completed" count={groups.completed.length}>
        {groups.completed.length === 0 ? (
          <EmptyHint text="Completed reminders will appear here." />
        ) : (
          <>
            {(showCompleted
              ? groups.completed
              : groups.completed.slice(0, 3)
            ).map((r) => card(r))}
            {groups.completed.length > 3 && (
              <button
                type="button"
                onClick={() => setShowCompleted((v) => !v)}
                className="text-sm font-medium text-sage hover:text-sage-deep"
              >
                {showCompleted
                  ? "Show less"
                  : `Show all ${groups.completed.length}`}
              </button>
            )}
          </>
        )}
      </Section>
    </div>
  );
}
