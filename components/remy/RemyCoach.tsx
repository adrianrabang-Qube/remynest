import Link from "next/link";
import { ChevronRight } from "lucide-react";

import type { RemyCoach as RemyCoachModel, CoachStatus } from "@/lib/remy/coach";

const STATUS_LABEL: Record<CoachStatus, string> = {
  healthy: "Healthy",
  growing: "Growing",
  attention: "Needs attention",
};

const STATUS_CLASS: Record<CoachStatus, string> = {
  healthy: "bg-primary/15 text-primary-deep",
  growing: "bg-sand-deep/30 text-charcoal-muted",
  attention: "bg-amber-100 text-amber-700",
};

/**
 * RemyCoach — renders the coaching items (lib/remy/coach.ts): title, detail, a
 * status badge and a link to the existing destination. Consumes the model
 * directly; no business logic, intelligence or derivation. Returns null when
 * there are no items (no placeholders, no fabricated content).
 */
export default function RemyCoach({ coach }: { coach: RemyCoachModel }) {
  if (coach.items.length === 0) return null;

  return (
    <section
      aria-label="Memory coach"
      className="rounded-3xl border border-sand-deep/70 bg-white p-4 shadow-soft md:p-6"
    >
      <p className="text-[11px] font-semibold uppercase tracking-wide text-charcoal-muted">
        Memory coach
      </p>

      <ul className="mt-2 divide-y divide-sand-deep/30">
        {coach.items.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className="flex min-h-[44px] items-center gap-3 py-2.5 transition hover:bg-sand/30"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-charcoal">
                  {item.title}
                </p>
                <p className="truncate text-xs text-charcoal-muted">
                  {item.detail}
                </p>
              </div>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_CLASS[item.status]}`}
              >
                {STATUS_LABEL[item.status]}
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
