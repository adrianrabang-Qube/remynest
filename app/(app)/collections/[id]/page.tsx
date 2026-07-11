import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import {
  getRemyCollectionById,
  formatCollectionRange,
} from "@/lib/remy/collections";
import { formatMemoryDateLabel } from "@/lib/memories/memory-date";

export const dynamic = "force-dynamic";

export default async function CollectionDetailPage({
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

  const result = await getRemyCollectionById(
    supabase,
    user.id,
    params.id
  );

  if (!result) {
    notFound();
  }

  const { collection, memories } = result;
  const range = formatCollectionRange(collection);

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <Link
        href="/collections"
        className="text-sm text-charcoal-muted hover:text-charcoal"
      >
        ← All collections
      </Link>

      <header className="mt-4 rounded-3xl border border-sand-deep/70 bg-white p-8 shadow-soft">
        <h1 className="text-3xl font-semibold text-charcoal break-words">
          {collection.title}
        </h1>

        {collection.summary && (
          <p className="mt-3 text-charcoal-soft leading-relaxed break-words">
            {collection.summary}
          </p>
        )}

        <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
          <span className="font-medium text-charcoal">
            {collection.memoryCount}{" "}
            {collection.memoryCount === 1 ? "memory" : "memories"}
          </span>
          {range && (
            <span className="font-medium text-sage-deep">{range}</span>
          )}
          {collection.emotionalThemes.length > 0 && (
            <span className="text-charcoal-muted">
              {collection.emotionalThemes.join(" • ")}
            </span>
          )}
        </div>
      </header>

      <section className="mt-8">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-charcoal-muted">
          Memories in this collection
        </h2>

        {memories.length === 0 ? (
          <p className="text-charcoal-soft">
            The memories in this collection aren&apos;t available right now.
          </p>
        ) : (
          <ul className="space-y-3">
            {memories.map((m) => (
              <li key={m.id}>
                <Link
                  href={`/memories/${m.id}`}
                  className="block rounded-2xl border border-sand-deep/70 bg-white p-5 shadow-soft transition hover:-translate-y-0.5 hover:shadow-soft-lg"
                >
                  <div className="flex items-start justify-between gap-4">
                    <h3 className="font-semibold text-charcoal break-words">
                      {m.ai_title?.trim() ||
                        m.title?.trim() ||
                        "Untitled memory"}
                    </h3>
                    {m.ai_category && (
                      <span className="shrink-0 rounded-full bg-sand/60 px-3 py-1 text-xs text-charcoal-muted">
                        {m.ai_category}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm font-medium text-sage-deep">
                    🕰 {formatMemoryDateLabel(m)}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
