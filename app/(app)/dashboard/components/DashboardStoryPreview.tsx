import Link from "next/link";
import { ChevronRight } from "lucide-react";

interface DashboardStoryPreviewProps {
  collectionCount: number;
  connectionCount: number;
  chapterCount: number;
  /** Most recent guided story, if any — the "continue reading" entry. */
  continueReading?: { label: string; href: string } | null;
  /** Which narrative surfaces currently exist (drives the chips). */
  narratives?: { story: boolean; biography: boolean; memoryBook: boolean };
}

const NARRATIVE_LINKS = [
  { key: "story", label: "Story", href: "/library/story" },
  { key: "biography", label: "Biography", href: "/library/biography" },
  { key: "memoryBook", label: "Memory Book", href: "/library/memory-book" },
] as const;

/**
 * DashboardStoryPreview — a single compact Home card that previews the Library
 * (Collections/Connections/Chapters counts + the narrative surfaces) and links
 * to it, replacing the six full intelligence widgets. The full destinations
 * live in /library; the dashboard only previews them.
 */
export default function DashboardStoryPreview({
  collectionCount,
  connectionCount,
  chapterCount,
  continueReading = null,
  narratives,
}: DashboardStoryPreviewProps) {
  const availableNarratives = NARRATIVE_LINKS.filter(
    (item) => narratives?.[item.key],
  );

  return (
    <section
      aria-labelledby="explore-story-heading"
      className="rounded-3xl border border-sand-deep/70 bg-white p-4 shadow-soft md:p-6"
    >
      <div className="flex items-center justify-between gap-3">
        <h2
          id="explore-story-heading"
          className="text-lg font-semibold text-charcoal"
        >
          Explore your story
        </h2>
        <Link
          href="/library"
          className="inline-flex items-center gap-1 text-sm font-semibold text-primary-deep hover:underline"
        >
          Open Library
          <ChevronRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>

      <dl className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm">
        <div className="flex items-baseline gap-1">
          <dt className="text-charcoal-muted">Collections</dt>
          <dd className="font-semibold text-charcoal">{collectionCount}</dd>
        </div>
        <div className="flex items-baseline gap-1">
          <dt className="text-charcoal-muted">Connections</dt>
          <dd className="font-semibold text-charcoal">{connectionCount}</dd>
        </div>
        <div className="flex items-baseline gap-1">
          <dt className="text-charcoal-muted">Chapters</dt>
          <dd className="font-semibold text-charcoal">{chapterCount}</dd>
        </div>
      </dl>

      {availableNarratives.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {availableNarratives.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              className="rounded-full border border-sand-deep/70 bg-sand/30 px-3 py-1.5 text-xs font-medium text-charcoal-soft transition hover:bg-sand/60"
            >
              {item.label}
            </Link>
          ))}
        </div>
      )}

      {continueReading && (
        <Link
          href={continueReading.href}
          className="mt-3 flex items-center justify-between gap-3 rounded-2xl border border-sand-deep/60 bg-sand/30 px-3 py-2.5 transition hover:bg-sand/50"
        >
          <span className="min-w-0">
            <span className="block text-xs text-charcoal-muted">
              Continue reading
            </span>
            <span className="block truncate text-sm font-medium text-charcoal">
              {continueReading.label}
            </span>
          </span>
          <ChevronRight
            className="h-4 w-4 shrink-0 text-charcoal-muted"
            aria-hidden
          />
        </Link>
      )}
    </section>
  );
}
