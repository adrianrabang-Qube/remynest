import type { Metadata } from "next";

import RemyStage from "@/components/remy/platform/RemyStage";
import ActivityCard from "@/components/activities/ActivityCard";
import {
  availableActivities,
  upcomingActivities,
} from "@/lib/activities/registry";

export const metadata: Metadata = {
  title: "Remy's Activities",
};

/**
 * Remy's Activities — the permanent home of every RemyNest activity.
 *
 * A calm, registry-driven landing page (`lib/activities/registry.ts` is the
 * single source of truth — this page hardcodes NO activity). Auth comes from
 * the protect-by-default middleware + the (app) group layout; the registry is
 * static config, so there are no data reads here. Copy follows the LA1/LA5
 * de-medicalization rule: gentle time with memories — never cognitive/clinical
 * claims.
 */
export default function ActivitiesPage() {
  const available = availableActivities();
  const upcoming = upcomingActivities();

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <header>
        <h1 className="font-serif text-2xl font-semibold text-charcoal md:text-3xl">
          Remy&apos;s Activities
        </h1>
        <p className="mt-1 text-charcoal-soft">
          Gentle ways to spend time with your memories.
        </p>
      </header>

      {/* Remy introduces the space — in-place platform stage (policy-driven look). */}
      <section className="mt-6 flex items-center gap-4 rounded-3xl border border-sand-deep/70 bg-white p-5 shadow-soft">
        <RemyStage context="welcome" size={72} className="shrink-0" />
        <p className="text-[15px] leading-relaxed text-charcoal-soft">
          <span className="font-semibold text-charcoal">
            This is Remy&apos;s corner for doing, not scrolling.
          </span>{" "}
          Unhurried activities made from your own photos and moments — no
          timers, no scores, nothing to lose.
        </p>
      </section>

      {/* Available now */}
      <section aria-labelledby="activities-now" className="mt-8">
        <h2
          id="activities-now"
          className="font-serif text-lg font-semibold text-charcoal"
        >
          Ready to enjoy
        </h2>
        {available.length > 0 ? (
          <div className="mt-3 space-y-3">
            {available.map((a) => (
              <ActivityCard key={a.slug} activity={a} />
            ))}
          </div>
        ) : (
          /* Empty state — reachable only if every activity is flagged off. */
          <div className="mt-3 rounded-3xl border border-sand-deep/70 bg-white p-8 text-center shadow-soft">
            <p className="text-charcoal-soft">
              Remy is setting up the first activity.
            </p>
            <p className="mt-1 text-sm text-charcoal-muted">
              Check back soon — it&apos;s nearly ready.
            </p>
          </div>
        )}
      </section>

      {/* On the way */}
      {upcoming.length > 0 && (
        <section aria-labelledby="activities-upcoming" className="mt-8">
          <h2
            id="activities-upcoming"
            className="font-serif text-lg font-semibold text-charcoal"
          >
            What Remy is preparing
          </h2>
          <div className="mt-3 space-y-3">
            {upcoming.map((a) => (
              <ActivityCard key={a.slug} activity={a} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
