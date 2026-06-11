import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import {
  getRemyLifeChapterById,
  formatChapterRange,
} from "@/lib/remy/life-chapters";
import { formatMemoryDateLabel } from "@/lib/memories/memory-date";

export const dynamic = "force-dynamic";

export default async function ChapterDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const result = await getRemyLifeChapterById(
    supabase,
    user.id,
    params.id
  );

  if (!result) {
    notFound();
  }

  const { chapter, memories } = result;
  const range = formatChapterRange(chapter);

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <Link
        href="/chapters"
        className="text-sm text-charcoal-muted hover:text-charcoal"
      >
        ← All chapters
      </Link>

      <header className="mt-4 rounded-3xl border border-sand-deep/70 bg-white p-8 shadow-soft">
        <h1 className="text-3xl font-semibold text-charcoal break-words">
          {chapter.title}
        </h1>
        {range && (
          <p className="mt-2 text-lg font-medium text-sage-deep">{range}</p>
        )}

        <p className="mt-3 text-charcoal-soft">
          Many of these memories belong to the same period. This chapter
          contains {chapter.memoryCount} connected{" "}
          {chapter.memoryCount === 1 ? "memory" : "memories"}.
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
          {chapter.themes.length > 0 && (
            <span className="text-charcoal-muted">
              {chapter.themes.join(" • ")}
            </span>
          )}
          {chapter.connectedCollections > 0 && (
            <span className="text-charcoal-muted">
              {chapter.connectedCollections} related{" "}
              {chapter.connectedCollections === 1
                ? "collection"
                : "collections"}
            </span>
          )}
        </div>
      </header>

      <section className="mt-8">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-charcoal-muted">
          Memories in this chapter
        </h2>

        {memories.length === 0 ? (
          <p className="text-charcoal-soft">
            The memories in this chapter aren&apos;t available right now.
          </p>
        ) : (
          <ul className="space-y-3">
            {memories.map((m) => (
              <li key={m.id}>
                <Link
                  href={`/memories/${m.id}`}
                  className="block rounded-2xl border border-sand-deep/70 bg-white p-5 shadow-soft transition hover:-translate-y-0.5 hover:shadow-soft-lg"
                >
                  <h3 className="font-semibold text-charcoal break-words">
                    {m.ai_title?.trim() ||
                      m.title?.trim() ||
                      "Untitled memory"}
                  </h3>
                  <p className="mt-1 text-sm font-medium text-sage-deep">
                    🕰 {formatMemoryDateLabel(m)}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
