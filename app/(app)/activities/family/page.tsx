import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Plus, Users } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { getActiveContext } from "@/lib/active-profile";
import { listTogetherTimes } from "@/lib/together-time/queries";
import RemyStage from "@/components/remy/platform/RemyStage";

export const metadata: Metadata = { title: "Family Activities" };
export const dynamic = "force-dynamic";

/**
 * Family Activities hub (Activity #5) — "Your together times": one honest
 * list ordered by last opened, then recency. Probe-gated "family room" state
 * until the operator applies the migration.
 */
export default async function FamilyHubPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const context = await getActiveContext();
  const activeProfileId = context.type === "CARE" ? context.profileId : null;
  const listing = await listTogetherTimes(user.id, activeProfileId);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <Link
        href="/activities"
        className="inline-flex min-h-11 items-center gap-1.5 rounded-full text-sm font-medium text-charcoal-soft transition hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Remy&apos;s Activities
      </Link>

      <header className="mt-4">
        <h1 className="font-serif text-2xl font-semibold text-charcoal md:text-3xl">
          Family Activities
        </h1>
        <p className="mt-1 text-charcoal-soft">
          Together Time — a gentle way to look back through memories with
          someone you love.
        </p>
      </header>

      {!listing.available ? (
        <section className="mt-6 rounded-3xl border border-sand-deep/70 bg-white p-8 text-center shadow-soft">
          <RemyStage context="welcome" size={112} className="mx-auto mb-3" />
          <p className="text-charcoal-soft">Remy is setting up the family room.</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-charcoal-muted">
            Together Time will open here very soon.
          </p>
        </section>
      ) : (
        <>
          <Link
            href="/activities/family/new"
            className="mt-6 flex min-h-11 items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 font-semibold text-white shadow-soft transition hover:bg-primary-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            <Plus className="h-5 w-5" aria-hidden />
            Create a together time
          </Link>

          {listing.sets.length === 0 ? (
            <section className="mt-6 rounded-3xl border border-sand-deep/70 bg-white p-8 text-center shadow-soft">
              <RemyStage context="welcome" size={112} className="mx-auto mb-3" />
              <p className="text-charcoal-soft">No together times yet.</p>
              <p className="mx-auto mt-1 max-w-sm text-sm text-charcoal-muted">
                Pick a few favourite memories and look back through them
                together.
              </p>
            </section>
          ) : (
            <section aria-labelledby="your-together-times" className="mt-8">
              <h2
                id="your-together-times"
                className="font-serif text-lg font-semibold text-charcoal"
              >
                Your together times
              </h2>
              <div className="mt-3 space-y-3">
                {listing.sets.map((set) => (
                  <Link
                    key={set.id}
                    href={`/activities/family/${set.id}`}
                    className="flex items-center gap-4 rounded-3xl border border-sand-deep/70 bg-white p-4 shadow-soft transition hover:border-primary/30 hover:shadow-soft-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <span
                      aria-hidden
                      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sand text-gold-ink"
                    >
                      <Users className="h-6 w-6" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[17px] font-semibold text-charcoal">
                        {set.title || "Together time"}
                      </span>
                      <span className="mt-0.5 block text-sm text-charcoal-muted">
                        {set.memory_ids.length} moment
                        {set.memory_ids.length === 1 ? "" : "s"}
                        {set.last_opened_at &&
                          ` · last opened ${new Date(set.last_opened_at).toLocaleDateString(undefined, { day: "numeric", month: "short" })}`}
                      </span>
                    </span>
                    <span aria-hidden className="shrink-0 text-sm font-semibold text-primary">
                      Open
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
