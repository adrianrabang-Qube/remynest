"use client";

import Link from "next/link";
import type {
  FamilyProfileStats,
} from "@/lib/remy/family";
import type { RemyObservation } from "@/lib/remy/types";

/**
 * Family Overview — a family-level snapshot of each member's memory activity,
 * with a few human observations. Mobile responsive; relative time client-side.
 */
export default function FamilyOverview({
  profiles,
  observations,
}: {
  profiles: FamilyProfileStats[];
  observations: RemyObservation[];
}) {
  if (profiles.length === 0) return null;

  return (
    <section className="rounded-3xl border border-sand-deep/70 bg-white p-6 shadow-soft">
      <h2 className="text-lg font-semibold text-charcoal">Family Overview</h2>

      {observations.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {observations.map((o) => (
            <li
              key={o.id}
              className="flex items-start justify-between gap-3 text-sm"
            >
              <span className="text-charcoal-soft break-words">{o.text}</span>
              {o.cta && (
                <Link
                  href={o.cta.href}
                  className="shrink-0 whitespace-nowrap text-xs font-semibold text-primary-deep underline-offset-2 hover:underline"
                >
                  {o.cta.label} →
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}

      <ul className="mt-4 grid gap-3 sm:grid-cols-2">
        {profiles.map((p) => (
          <li
            key={p.id}
            className="rounded-2xl border border-sand-deep/60 p-4"
          >
            <p className="font-semibold text-charcoal break-words">{p.name}</p>
            <ul className="mt-1 space-y-0.5 text-sm text-charcoal-soft">
              <li>
                • {p.memoryCount}{" "}
                {p.memoryCount === 1 ? "memory" : "memories"}
              </li>
              {p.chapterCount > 0 && (
                <li>
                  • {p.chapterCount}{" "}
                  {p.chapterCount === 1 ? "chapter" : "chapters"}
                </li>
              )}
              <li>
                •{" "}
                <span suppressHydrationWarning>
                  {p.lastActivityAt
                    ? `Last memory ${relativeTime(p.lastActivityAt)}`
                    : "No memories yet"}
                </span>
              </li>
            </ul>
          </li>
        ))}
      </ul>
    </section>
  );
}

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "recently";
  const diff = Date.now() - then;
  const HOUR = 3_600_000;
  const DAY = 86_400_000;
  if (diff < HOUR) return "just now";
  if (diff < DAY) {
    const h = Math.floor(diff / HOUR);
    return `${h} hour${h === 1 ? "" : "s"} ago`;
  }
  const d = Math.floor(diff / DAY);
  if (d < 7) return `${d} day${d === 1 ? "" : "s"} ago`;
  if (d < 30) {
    const w = Math.floor(d / 7);
    return `${w} week${w === 1 ? "" : "s"} ago`;
  }
  const mo = Math.floor(d / 30);
  if (mo < 12) return `${mo} month${mo === 1 ? "" : "s"} ago`;
  const y = Math.floor(d / 365);
  return `${y} year${y === 1 ? "" : "s"} ago`;
}
