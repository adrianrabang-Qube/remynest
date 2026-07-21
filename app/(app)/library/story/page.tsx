import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { createClient } from "@/utils/supabase/server";
import { getRemyLifeChapters } from "@/lib/remy/life-chapters";
import { getRemyCollections } from "@/lib/remy/collections";
import { getRemyConnections } from "@/lib/remy/connections";
import { getRemyStories } from "@/lib/remy/story-mode";
import RemyStoryMode from "@/components/remy/RemyStoryMode";

export const dynamic = "force-dynamic";

export default async function LibraryStoryPage() {
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

  return (
    <div className="space-y-4 p-4 md:p-6">
      <Link
        href="/library"
        className="inline-flex items-center gap-1 rounded py-1 text-sm font-medium text-primary-deep transition hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden /> Library
      </Link>

      <h1 className="sr-only">Story</h1>

      {stories.length > 0 ? (
        <RemyStoryMode stories={stories} />
      ) : (
        <div className="rounded-3xl border border-sand-deep/70 bg-white p-8 text-center shadow-soft">
          <p className="text-sm text-charcoal-soft">
            Remy hasn&apos;t composed your story yet. Add more dated memories and
            it will appear here.
          </p>
        </div>
      )}
    </div>
  );
}
