"use client";

import { useState } from "react";
import Link from "next/link";
import type { RemyActivity } from "@/lib/remy/types";

const DEFAULT_VISIBLE = 3;

/**
 * Remy Activity feed — "what Remy noticed". A curated insight preview, not an
 * ever-growing event log: it shows the 3 most recent items and expands in-place
 * when there are more. The evidence layer beneath Remy's observations.
 * Read-only; relative time is computed client-side.
 */
export default function RemyActivityFeed({
  activities,
}: {
  activities: RemyActivity[];
}) {
  const [expanded, setExpanded] = useState(false);

  const hasMore = activities.length > DEFAULT_VISIBLE;
  const visibleActivities = expanded
    ? activities
    : activities.slice(0, DEFAULT_VISIBLE);

  return (
    <section className="rounded-3xl border border-sand-deep/70 bg-white p-4 md:p-6 shadow-soft">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-lg font-semibold text-charcoal">Remy Activity</h2>
        <span className="text-xs text-charcoal-muted">
          Recent things I&apos;ve noticed
        </span>
      </div>

      {activities.length === 0 ? (
        <p className="mt-4 text-sm text-charcoal-soft">
          Nothing new to note just yet — I&apos;ll surface meaningful moments
          here as they happen.
        </p>
      ) : (
        <>
          <ul className="mt-4 space-y-1">
            {visibleActivities.map((item) => (
              <ActivityRow key={item.id} item={item} />
            ))}
          </ul>

          {hasMore && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              aria-expanded={expanded}
              className="mt-3 w-full rounded-2xl px-3 py-2 text-left text-sm font-semibold text-sage-deep transition hover:bg-sand/40 sm:w-auto"
            >
              {expanded ? "Show less" : "Show more →"}
            </button>
          )}
        </>
      )}
    </section>
  );
}

function ActivityRow({ item }: { item: RemyActivity }) {
  const body = (
    <div className="flex items-start gap-3 rounded-2xl px-3 py-2.5 transition hover:bg-sand/40">
      <span
        aria-hidden="true"
        className="mt-0.5 text-lg leading-none"
      >
        {item.icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-charcoal">{item.title}</p>
        <p className="text-sm text-charcoal-soft break-words">
          {item.description}
        </p>
      </div>
      <time
        suppressHydrationWarning
        className="shrink-0 whitespace-nowrap text-xs text-charcoal-muted"
      >
        {relativeTime(item.timestamp)}
      </time>
    </div>
  );

  if (item.href) {
    return (
      <li>
        <Link href={item.href} className="block">
          {body}
        </Link>
      </li>
    );
  }
  return <li>{body}</li>;
}

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diff = Date.now() - then;

  const MIN = 60_000;
  const HOUR = 3_600_000;
  const DAY = 86_400_000;

  if (diff < MIN) return "Just now";
  if (diff < HOUR) {
    const m = Math.floor(diff / MIN);
    return `${m} minute${m === 1 ? "" : "s"} ago`;
  }
  if (diff < DAY) {
    const h = Math.floor(diff / HOUR);
    return `${h} hour${h === 1 ? "" : "s"} ago`;
  }
  const d = Math.floor(diff / DAY);
  if (d < 7) return `${d} day${d === 1 ? "" : "s"} ago`;

  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
