import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { createClient } from "@/utils/supabase/server";
import { getRemyLifeChapters } from "@/lib/remy/life-chapters";
import { getRemyCollections } from "@/lib/remy/collections";
import { getRemyConnections } from "@/lib/remy/connections";
import { getRemyStories } from "@/lib/remy/story-mode";
import { getRemyBiography } from "@/lib/remy/biography";
import { getRemyMemoryBook } from "@/lib/remy/memory-book";
import { deriveLifeJourneySignals } from "@/lib/remy/life-journey-signals";
import { deriveStorySignals } from "@/lib/remy/story-signals";
import RemyMemoryBook from "@/components/remy/RemyMemoryBook";

export const dynamic = "force-dynamic";

export default async function LibraryMemoryBookPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [chapters, collections, connections] = await Promise.all([
    getRemyLifeChapters(supabase, user.id, { sort: "count", limit: 12 }),
    getRemyCollections(supabase, user.id, { limit: 12, includeDetails: true }),
    getRemyConnections(supabase, user.id, { limit: 12 }),
  ]);

  const stories = getRemyStories({ chapters, collections, connections });
  const biography = getRemyBiography({
    stories,
    chapters,
    collections,
    connections,
    family: null,
  });

  // Canonical signals (no new query — derived from the chapters already loaded).
  const lifeJourney = deriveLifeJourneySignals(
    chapters
      .map((c) => ({ decade: parseInt(c.id, 10), count: c.memoryCount }))
      .filter((d) => !Number.isNaN(d.decade)),
    null,
  );
  const story = deriveStorySignals({
    chapterCount: chapters.length,
    storyCount: stories.length,
    strongestChapterTitle: chapters[0]?.title ?? null,
    earliestYear: lifeJourney.earliestDecade,
    latestYear: lifeJourney.latestDecade,
    hasStory: stories.length > 0,
    hasBiography: Boolean(biography),
  });

  const book = getRemyMemoryBook({ biography, stories, lifeJourney, story });

  return (
    <div className="space-y-4 p-4 md:p-6">
      <Link
        href="/library"
        className="inline-flex items-center gap-1 rounded py-1 text-sm font-medium text-sage-deep transition hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden /> Library
      </Link>

      <h1 className="sr-only">Memory Book</h1>

      {book ? (
        <RemyMemoryBook book={book} />
      ) : (
        <div className="rounded-3xl border border-sand-deep/70 bg-white p-8 text-center shadow-soft">
          <p className="text-sm text-charcoal-soft">
            Remy hasn&apos;t bound your memory book yet. Add more dated memories
            and it will appear here.
          </p>
        </div>
      )}
    </div>
  );
}
