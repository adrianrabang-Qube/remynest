import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Plus } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { getActiveContext } from "@/lib/active-profile";
import { listStories } from "@/lib/stories/queries";
import RemyStage from "@/components/remy/platform/RemyStage";

export const metadata: Metadata = { title: "Story Builder" };
export const dynamic = "force-dynamic";

/**
 * Story Builder hub (Activity #2). One honest "Your stories" list — a saved
 * story has no meaningful in-progress state, so there are deliberately no
 * status shelves. Workspace from the VALIDATED active context; probe-gated
 * setting-up state until the operator applies the stories migration.
 */
export default async function StoriesHubPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const context = await getActiveContext();
  const activeProfileId = context.type === "CARE" ? context.profileId : null;
  const listing = await listStories(user.id, activeProfileId);

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
          Story Builder
        </h1>
        <p className="mt-1 text-charcoal-soft">
          Arrange your memories into little stories worth re-reading.
        </p>
      </header>

      {!listing.available ? (
        <section className="mt-6 rounded-3xl border border-sand-deep/70 bg-white p-8 text-center shadow-soft">
          <RemyStage context="welcome" size={112} className="mx-auto mb-3" />
          <p className="text-charcoal-soft">Remy is setting up the story desk.</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-charcoal-muted">
            Stories will open here very soon.
          </p>
        </section>
      ) : (
        <>
          <Link
            href="/activities/stories/new"
            className="mt-6 flex min-h-11 items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 font-semibold text-white shadow-soft transition hover:bg-primary-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            <Plus className="h-5 w-5" aria-hidden />
            Create a story
          </Link>

          {listing.stories.length === 0 ? (
            <section className="mt-6 rounded-3xl border border-sand-deep/70 bg-white p-8 text-center shadow-soft">
              <RemyStage context="welcome" size={112} className="mx-auto mb-3" />
              <p className="text-charcoal-soft">No stories yet.</p>
              <p className="mx-auto mt-1 max-w-sm text-sm text-charcoal-muted">
                Choose a handful of memories and arrange them into your first
                story.
              </p>
            </section>
          ) : (
            <section aria-labelledby="your-stories" className="mt-8">
              <h2
                id="your-stories"
                className="font-serif text-lg font-semibold text-charcoal"
              >
                Your stories
              </h2>
              <div className="mt-3 space-y-3">
                {listing.stories.map((story) => (
                  <Link
                    key={story.id}
                    href={`/activities/stories/${story.id}`}
                    className="flex items-center gap-4 rounded-3xl border border-sand-deep/70 bg-white p-4 shadow-soft transition hover:border-primary/30 hover:shadow-soft-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <span
                      aria-hidden
                      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sand font-serif text-xl text-gold-ink"
                    >
                      ”
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[17px] font-semibold text-charcoal">
                        {story.title || "Untitled story"}
                      </span>
                      <span className="mt-0.5 block text-sm text-charcoal-muted">
                        {story.memory_ids.length} moment
                        {story.memory_ids.length === 1 ? "" : "s"} ·{" "}
                        {new Date(story.updated_at).toLocaleDateString(undefined, {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </span>
                    <span
                      aria-hidden
                      className="shrink-0 text-sm font-semibold text-primary"
                    >
                      Read
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
