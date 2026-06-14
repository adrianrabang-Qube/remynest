import Link from "next/link";
import { ChevronRight } from "lucide-react";

import type {
  RemyJourneys as RemyJourneysModel,
  JourneyStatus,
} from "@/lib/remy/journeys";

const STATUS_LABEL: Record<JourneyStatus, string> = {
  ready: "Ready",
  growing: "Growing",
};

const STATUS_CLASS: Record<JourneyStatus, string> = {
  ready: "bg-sage/15 text-sage-deep",
  growing: "bg-sand-deep/30 text-charcoal-muted",
};

/**
 * RemyJourneys — renders the journey cards (lib/remy/journeys.ts): title,
 * description, a status badge and a link to the existing destination. Consumes
 * the model directly; no intelligence or derivation. Renders nothing when there
 * are no journeys (no placeholders, no fabricated content).
 */
export default function RemyJourneys({
  journeys,
}: {
  journeys: RemyJourneysModel;
}) {
  if (journeys.journeys.length === 0) return null;

  return (
    <section
      aria-label="Journeys"
      className="rounded-3xl border border-sand-deep/70 bg-white p-4 shadow-soft md:p-6"
    >
      <p className="text-[11px] font-semibold uppercase tracking-wide text-charcoal-muted">
        Journeys
      </p>

      <ul className="mt-2 grid gap-2 md:grid-cols-2">
        {journeys.journeys.map((journey) => (
          <li key={journey.href}>
            <Link
              href={journey.href}
              className="flex min-h-[44px] items-center gap-3 rounded-2xl border border-sand-deep/60 bg-white px-3 py-2.5 transition hover:bg-sand/40"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-charcoal">
                  {journey.title}
                </p>
                <p className="truncate text-xs text-charcoal-muted">
                  {journey.description}
                </p>
              </div>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_CLASS[journey.status]}`}
              >
                {STATUS_LABEL[journey.status]}
              </span>
              <ChevronRight
                className="h-4 w-4 shrink-0 text-charcoal-muted"
                aria-hidden
              />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
