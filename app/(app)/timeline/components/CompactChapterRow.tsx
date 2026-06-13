import Link from "next/link";
import { BookOpen, ChevronRight } from "lucide-react";

export interface CompactChapterRowChapter {
  id: string;
  title: string;
  memoryCount: number;
  startDate?: string;
  endDate?: string;
}

function formatDateRange(startDate?: string, endDate?: string) {
  if (!startDate || !endDate) return null;
  const fmt = (d: string) =>
    new Date(d).toLocaleDateString("en-IE", {
      month: "short",
      year: "numeric",
    });
  return `${fmt(startDate)} → ${fmt(endDate)}`;
}

/**
 * CompactChapterRow — the mobile Chapters row (~72px): title · date range ·
 * memory count · chevron. Links into the existing chapter view. Mobile-only —
 * desktop keeps LifeChapterCard.
 */
export default function CompactChapterRow({
  chapter,
}: {
  chapter: CompactChapterRowChapter;
}) {
  const range = formatDateRange(chapter.startDate, chapter.endDate);

  return (
    <li>
      <Link
        href={`/timeline?view=chapters&chapter=${chapter.id}`}
        className="flex items-center gap-3 px-3 py-3 transition active:bg-sand/50"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sage/10 text-sage">
          <BookOpen className="h-5 w-5" aria-hidden />
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-charcoal">
            {chapter.title}
          </p>
          <p className="mt-0.5 truncate text-[11px] text-charcoal-muted">
            {[range, `${chapter.memoryCount} memories`]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>

        <ChevronRight
          className="h-4 w-4 shrink-0 text-charcoal-muted"
          aria-hidden
        />
      </Link>
    </li>
  );
}
