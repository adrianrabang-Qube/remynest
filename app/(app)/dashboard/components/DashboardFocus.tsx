"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  deriveDashboardFocus,
  type FocusReminder,
} from "@/lib/reminders/focus";

/**
 * Dashboard V3 — the primary command center surface.
 *
 * Renders the shared Focus model (lib/reminders/focus) in the user's LOCAL
 * timezone: Right Now · Upcoming Today · Routine Progress · Reminder Summary ·
 * Remy Insight Preview. Read-only — no lifecycle/cron/notification behavior.
 */
export default function DashboardFocus({
  reminders,
  careProfileName,
  isMyNest,
}: {
  reminders: FocusReminder[];
  careProfileName: string | null;
  isMyNest: boolean;
}) {
  const focus = useMemo(
    () => deriveDashboardFocus(reminders, new Date()),
    [reminders]
  );

  const formatTime = (iso: string | null) => {
    if (!iso) return "";
    return new Date(iso).toLocaleString(undefined, {
      weekday: "short",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  // ---- My Nest: reminders are care-only, gentle redirect ----------------
  if (isMyNest) {
    return (
      <section className="rounded-3xl border border-sand-deep/70 bg-white p-4 md:p-6 shadow-soft">
        <h2 className="text-xl font-semibold text-charcoal">Today&apos;s Focus</h2>
        <p className="mt-2 text-sm text-charcoal-soft">
          Reminders live inside a care profile. Enter a care workspace to see
          the day&apos;s focus, routines, and gentle reminders.
        </p>
        <Link
          href="/reminders"
          className="mt-4 inline-flex items-center rounded-full bg-sage px-5 py-2.5 text-sm font-semibold text-white shadow-soft transition hover:bg-sage-deep"
        >
          Open Reminder Center
        </Link>
      </section>
    );
  }

  const { rightNow, summary } = focus;
  const upcoming = focus.upcomingToday.slice(0, 3);
  const routines = focus.routines.slice(0, 3);
  const rightNowOverdue =
    rightNow != null &&
    rightNow.remind_at != null &&
    new Date(rightNow.remind_at) < new Date();

  return (
    <section className="space-y-4">
      {/* RIGHT NOW — hero */}
      <div
        className={`rounded-3xl border p-6 shadow-soft ${
          rightNowOverdue
            ? "border-gold/50 bg-gold/10"
            : "border-sage/30 bg-sage/[0.06]"
        }`}
      >
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-charcoal-muted">
            Right now{careProfileName ? ` · ${careProfileName}` : ""}
          </p>
          <Link
            href="/reminders"
            className="text-xs font-semibold text-sage-deep underline-offset-2 hover:underline"
          >
            Reminder Center →
          </Link>
        </div>

        {rightNow ? (
          <div className="mt-3">
            <p className="text-2xl font-semibold text-charcoal">
              {rightNow.title}
            </p>
            <p className="mt-1 text-sm text-charcoal-soft">
              {rightNowOverdue ? "Overdue · " : ""}
              {formatTime(rightNow.remind_at)}
            </p>
          </div>
        ) : (
          <div className="mt-3">
            <p className="text-2xl font-semibold text-charcoal">All clear</p>
            <p className="mt-1 text-sm text-charcoal-soft">
              Nothing needs attention right now.
            </p>
          </div>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* UPCOMING TODAY */}
        <div className="rounded-3xl border border-sand-deep/70 bg-white p-4 md:p-6 shadow-soft">
          <h2 className="text-lg font-semibold text-charcoal">Upcoming today</h2>
          {upcoming.length > 0 ? (
            <ul className="mt-3 space-y-2 text-sm">
              {upcoming.map((r) => (
                <li
                  key={r.id}
                  className="flex items-center justify-between gap-3"
                >
                  <span className="truncate text-charcoal">{r.title}</span>
                  <span className="shrink-0 text-charcoal-muted">
                    {formatTime(r.remind_at)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-charcoal-soft">
              Nothing else scheduled for today.
            </p>
          )}
        </div>

        {/* ROUTINE PROGRESS */}
        <div className="rounded-3xl border border-sand-deep/70 bg-white p-4 md:p-6 shadow-soft">
          <h2 className="text-lg font-semibold text-charcoal">Routine progress</h2>
          {routines.length > 0 ? (
            <>
              <p className="mt-1 text-sm text-charcoal-soft">
                {summary.completedToday} done today · {summary.routines}{" "}
                {summary.routines === 1 ? "routine" : "routines"}
              </p>
              <ul className="mt-3 space-y-2 text-sm">
                {routines.map((r) => (
                  <li
                    key={r.id}
                    className="flex items-center justify-between gap-3"
                  >
                    <span className="truncate text-charcoal">{r.title}</span>
                    <span className="shrink-0 text-charcoal-muted capitalize">
                      {r.frequency || "recurring"}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="mt-3 text-sm text-charcoal-soft">
              No daily routines set up yet.
            </p>
          )}
        </div>
      </div>

      {/* REMINDER SUMMARY */}
      <div className="rounded-3xl border border-sand-deep/70 bg-sand/40 p-5 shadow-soft">
        <div className="flex flex-wrap gap-2 text-sm">
          <SummaryChip label="Today" value={summary.todayTotal} />
          <SummaryChip
            label="Overdue"
            value={summary.overdue}
            tone={summary.overdue > 0 ? "warn" : "calm"}
          />
          <SummaryChip label="Upcoming" value={summary.upcomingToday} />
          <SummaryChip label="Done today" value={summary.completedToday} />
        </div>
      </div>
    </section>
  );
}

function SummaryChip({
  label,
  value,
  tone = "calm",
}: {
  label: string;
  value: number;
  tone?: "calm" | "warn";
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-medium ${
        tone === "warn"
          ? "bg-gold/15 text-charcoal"
          : "bg-white text-charcoal-soft"
      }`}
    >
      <span className="text-charcoal-muted">{label}</span>
      <span className="font-semibold text-charcoal">{value}</span>
    </span>
  );
}
