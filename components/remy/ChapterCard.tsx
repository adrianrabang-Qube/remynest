import Link from "next/link";
import {
  formatChapterRange,
  type RemyLifeChapter,
} from "@/lib/remy/life-chapters";

/**
 * Chapter card — a visual, human-readable summary of a life chapter.
 * No internal grouping language ever appears here.
 */
export default function ChapterCard({
  chapter,
}: {
  chapter: RemyLifeChapter;
}) {
  const range = formatChapterRange(chapter);

  return (
    <Link
      href={`/chapters/${chapter.id}`}
      className="block rounded-3xl border border-sand-deep/70 bg-white p-6 shadow-soft transition hover:-translate-y-0.5 hover:shadow-soft-lg"
    >
      <h3 className="text-lg font-semibold text-charcoal break-words">
        {chapter.title}
      </h3>

      {range && (
        <p className="mt-1 text-sm font-medium text-sage-deep">{range}</p>
      )}

      <p className="mt-2 text-sm text-charcoal-soft">
        {chapter.memoryCount}{" "}
        {chapter.memoryCount === 1 ? "memory" : "memories"}
      </p>

      {chapter.themes.length > 0 && (
        <p className="mt-3 text-xs text-charcoal-muted">
          {chapter.themes.join(" • ")}
        </p>
      )}
    </Link>
  );
}
