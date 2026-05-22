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
    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-all duration-300">

      <div className="p-7">

        <div className="flex items-start justify-between gap-4">

          <div className="min-w-0 flex-1">

            <h2 className="text-3xl font-bold text-gray-900 break-words">
              {chapter.title}
            </h2>

            <p className="text-gray-400 mt-3">
              {dateRange}
            </p>
          </div>

          <div className="shrink-0">

            <span className="px-4 py-2 rounded-full bg-black text-white text-sm whitespace-nowrap">
              {
                chapter.memoryCount
              } memories
            </span>
          </div>
        </div>

        <div className="mt-8">

          <h4 className="text-xs uppercase tracking-wider text-gray-400 mb-3">
            Key Themes
          </h4>

          <div className="flex flex-wrap gap-2">

            {chapter.themes.map(
              (theme) => (
                <span
                  key={theme}
                  className="px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-sm"
                >
                  {theme}
                </span>
              )
            )}
          </div>
        </div>

        <div className="mt-8">

          <h4 className="text-xs uppercase tracking-wider text-gray-400 mb-3">
            AI Summary
          </h4>

          <p className="text-gray-700 leading-relaxed text-lg">
            {chapter.summary}
          </p>
        </div>

        <div className="mt-10">

          <Link
            href={`/timeline?view=chapters&chapter=${chapter.id}`}
            className="inline-flex items-center px-5 py-3 rounded-2xl bg-black text-white text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Open Chapter
          </Link>
        </div>
      </div>
    </div>
  );
}