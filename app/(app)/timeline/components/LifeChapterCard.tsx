import Link from "next/link";

type LifeChapter = {
  id: string;
  title: string;
  summary: string;

  memoryCount: number;

  startDate?: string;
  endDate?: string;

  themes: string[];
};

type LifeChapterCardProps = {
  chapter: LifeChapter;
};

function formatDateRange({
  startDate,
  endDate,
}: {
  startDate?: string;
  endDate?: string;
}) {
  if (!startDate || !endDate) {
    return "Timeline range unavailable";
  }

  const start =
    new Date(
      startDate
    ).toLocaleDateString(
      "en-IE",
      {
        month: "short",
        year: "numeric",
      }
    );

  const end =
    new Date(
      endDate
    ).toLocaleDateString(
      "en-IE",
      {
        month: "short",
        year: "numeric",
      }
    );

  return `${start} → ${end}`;
}

export default function LifeChapterCard({
  chapter,
}: LifeChapterCardProps) {
  const dateRange =
    formatDateRange({
      startDate:
        chapter.startDate,
      endDate:
        chapter.endDate,
    });

  return (
    <div className="overflow-hidden rounded-3xl border border-sand-deep/70 bg-white shadow-soft transition hover:shadow-soft-lg motion-reduce:transition-none">
      <div className="p-6 md:p-7">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h2 className="break-words font-serif text-2xl font-semibold text-charcoal md:text-3xl">
              {chapter.title}
            </h2>

            <p className="mt-2 text-sm text-charcoal-muted">
              {dateRange}
            </p>
          </div>

          <div className="shrink-0">
            <span className="whitespace-nowrap rounded-full bg-sage px-4 py-2 text-sm text-white">
              {chapter.memoryCount} memories
            </span>
          </div>
        </div>

        <div className="mt-6">
          <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-charcoal-muted">
            Key Themes
          </h4>

          <div className="flex flex-wrap gap-2">
            {chapter.themes.map(
              (theme) => (
                <span
                  key={theme}
                  className="rounded-full bg-sand px-3 py-1 text-sm text-charcoal-soft"
                >
                  {theme}
                </span>
              )
            )}
          </div>
        </div>

        <div className="mt-6">
          <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-charcoal-muted">
            AI Summary
          </h4>

          <p className="text-base leading-relaxed text-charcoal-soft md:text-lg">
            {chapter.summary}
          </p>
        </div>

        <div className="mt-8">
          <Link
            href={`/timeline?view=chapters&chapter=${chapter.id}`}
            className="inline-flex min-h-11 items-center rounded-full bg-sage px-5 py-2.5 text-[15px] font-semibold text-white transition hover:bg-sage-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage focus-visible:ring-offset-2 focus-visible:ring-offset-sand"
          >
            Open Chapter
          </Link>
        </div>
      </div>
    </div>
  );
}
