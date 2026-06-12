import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { getRemyLifeChapters } from "@/lib/remy/life-chapters";
import ChapterCard from "@/components/remy/ChapterCard";

export const dynamic = "force-dynamic";

export default async function ChaptersPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const chapters = await getRemyLifeChapters(supabase, user.id, {
    sort: "chronological",
  });

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <header className="mb-8">
        <h1 className="text-4xl font-semibold text-charcoal">Life Chapters</h1>
        <p className="mt-2 text-charcoal-soft">
          The meaningful periods Remy has begun to recognize across a lifetime
          of memories.
        </p>
      </header>

      {chapters.length === 0 ? (
        <div className="rounded-3xl border border-sand-deep/70 bg-white p-8 shadow-soft">
          <p className="text-charcoal-soft">
            Life chapters take shape once memories are placed in time. Add dates
            — even a rough year or decade — and Remy will gather them into the
            periods of a life.
          </p>
          <Link
            href="/memory-dates"
            className="mt-5 inline-flex items-center rounded-full bg-sage px-6 py-3 text-base font-semibold text-white shadow-soft transition hover:bg-sage-deep"
          >
            Add memory dates
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {chapters.map((chapter) => (
            <ChapterCard key={chapter.id} chapter={chapter} />
          ))}
        </div>
      )}
    </main>
  );
}
