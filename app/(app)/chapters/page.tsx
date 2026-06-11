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
        <div className="rounded-3xl border border-sand-deep/70 bg-white p-8 text-charcoal-soft shadow-soft">
          Remy hasn&apos;t shaped any chapters yet. As more memories are added —
          especially historical ones — life chapters will begin to take form.
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
