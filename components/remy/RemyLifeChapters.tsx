import Link from "next/link";
import {
  formatChapterRange,
  type RemyLifeChapter,
} from "@/lib/remy/life-chapters";

/**
 * Life Chapters (dashboard section) — Remy's narrative layer. Presentational;
 * hides itself when no chapters have taken shape yet (graceful).
 */
export default function RemyLifeChapters({
  chapters,
  subjectName = null,
}: {
  chapters: RemyLifeChapter[];
  subjectName?: string | null;
}) {
  if (chapters.length === 0) return null;

  const intro = subjectName
    ? `I've started identifying important chapters in ${subjectName}'s life.`
    : `I've started identifying important chapters in your story.`;

  return (
    <section className="rounded-3xl border border-sand-deep/70 bg-white p-6 shadow-soft">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-lg font-semibold text-charcoal">Life Chapters</h2>
        <Link
          href="/chapters"
          className="text-xs font-semibold text-sage-deep underline-offset-2 hover:underline"
        >
          View all chapters →
        </Link>
      </div>

      <p className="mt-1 text-sm text-charcoal-soft">{intro}</p>

      <ul className="mt-4 grid gap-3 sm:grid-cols-2">
        {chapters.map((c) => {
          const range = formatChapterRange(c);
          return (
            <li key={c.id}>
              <Link
                href={`/chapters/${c.id}`}
                className="block rounded-2xl border border-sand-deep/60 px-4 py-3 transition hover:bg-sand/40"
              >
                <p className="font-medium text-charcoal break-words">
                  {c.title}
                </p>
                <p className="text-sm text-charcoal-muted">
                  {range ? `${range} · ` : ""}
                  {c.memoryCount}{" "}
                  {c.memoryCount === 1 ? "memory" : "memories"}
                </p>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
