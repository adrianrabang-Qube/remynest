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
  const book = getRemyMemoryBook({ biography, stories });

  return (
    <div className="space-y-4 p-4 md:p-6">
      <Link
        href="/library"
        className="inline-flex items-center gap-1 text-sm font-medium text-sage-deep hover:underline"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden /> Library
      </Link>

      {book ? (
        <RemyMemoryBook book={book} />
      ) : (
        <p className="rounded-2xl border border-sand-deep/60 bg-white p-6 text-sm text-charcoal-soft">
          Remy hasn&apos;t bound your memory book yet. Add more dated memories
          and it will appear here.
        </p>
      )}
    </div>
  );
}
