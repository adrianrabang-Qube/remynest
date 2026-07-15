import Link from "next/link";

import {
  ACTIVITY_STATUS_LABEL,
  type Activity,
} from "@/lib/activities/registry";

/**
 * One activity on the Activities landing page. Status-driven presentation
 * (registry is the single source of truth):
 *  - available   → a tappable card (whole card is the link, sage focus ring,
 *                  ≥44px target) with an inviting "Open" affordance.
 *  - coming-soon → non-interactive announcement card with a gold-ink badge.
 *  - future      → the same, quieter (muted icon, softer badge) — visible so the
 *                  platform reads as growing, but never promising a date.
 * Pure presentation; server-compatible (no hooks). Brand: rounded-3xl, sand
 * hairlines, shadow-soft, serif reserved for the page header (cards stay sans).
 */
export default function ActivityCard({ activity }: { activity: Activity }) {
  const { title, tagline, status, href, Icon } = activity;

  const iconBadge = (
    <span
      aria-hidden
      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
        status === "available"
          ? "bg-sage text-white"
          : status === "coming-soon"
            ? "bg-sand text-sage"
            : "bg-sand text-charcoal-muted"
      }`}
    >
      <Icon className="h-6 w-6" />
    </span>
  );

  const body = (
    <>
      {iconBadge}
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span
            className={`block min-w-0 text-[17px] font-semibold leading-snug ${
              status === "future" ? "text-charcoal-soft" : "text-charcoal"
            }`}
          >
            {title}
          </span>
          {status !== "available" && (
            <span
              className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                status === "coming-soon"
                  ? "bg-gold-soft/50 text-gold-ink"
                  : "bg-sand text-charcoal-muted"
              }`}
            >
              {ACTIVITY_STATUS_LABEL[status]}
            </span>
          )}
        </span>
        <span className="mt-0.5 block text-sm leading-snug text-charcoal-muted">
          {tagline}
        </span>
      </span>
    </>
  );

  if (status === "available" && href) {
    return (
      <Link
        href={href}
        className="flex items-center gap-3 rounded-3xl border border-sand-deep/70 bg-white p-4 shadow-soft transition hover:border-sage/30 hover:shadow-soft-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage sm:gap-4"
      >
        {body}
        <span
          aria-hidden
          className="shrink-0 text-sm font-semibold text-sage"
        >
          Open
        </span>
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-3xl border border-sand-deep/50 bg-white/70 p-4 sm:gap-4">
      {body}
    </div>
  );
}
