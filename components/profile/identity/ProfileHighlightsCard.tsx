import Link from "next/link";
import { BookMarked, FolderHeart, Link2, ChevronRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface ProfileHighlight {
  label: string;
  meta?: string;
  href: string;
}

interface ProfileHighlightsCardProps {
  topChapter?: ProfileHighlight | null;
  topCollection?: ProfileHighlight | null;
  strongestConnection?: ProfileHighlight | null;
}

function HighlightRow({
  title,
  icon: Icon,
  highlight,
}: {
  title: string;
  icon: LucideIcon;
  highlight: ProfileHighlight;
}) {
  return (
    <Link
      href={highlight.href}
      className="flex items-center gap-3 rounded-2xl px-2 py-2.5 transition hover:bg-sand/40"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Icon className="h-5 w-5" aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium uppercase tracking-wide text-charcoal-muted">
          {title}
        </p>
        <p className="truncate text-sm font-medium text-charcoal">
          {highlight.label}
          {highlight.meta && (
            <span className="font-normal text-charcoal-muted">
              {" "}
              · {highlight.meta}
            </span>
          )}
        </p>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-charcoal-muted" aria-hidden />
    </Link>
  );
}

/**
 * ProfileHighlightsCard — the most significant chapter, collection and
 * connection, derived from existing Remy intelligence (top-ranked items). No new
 * AI generation. Rows are hidden when their highlight is absent.
 */
export default function ProfileHighlightsCard({
  topChapter,
  topCollection,
  strongestConnection,
}: ProfileHighlightsCardProps) {
  if (!topChapter && !topCollection && !strongestConnection) return null;

  return (
    <section className="rounded-3xl border border-sand-deep/70 bg-white p-4 shadow-soft md:p-6">
      <h2 className="mb-1 text-lg font-semibold text-charcoal">Life highlights</h2>
      <div className="divide-y divide-sand-deep/30">
        {topChapter && (
          <HighlightRow title="Top chapter" icon={BookMarked} highlight={topChapter} />
        )}
        {topCollection && (
          <HighlightRow
            title="Top collection"
            icon={FolderHeart}
            highlight={topCollection}
          />
        )}
        {strongestConnection && (
          <HighlightRow
            title="Strongest connection"
            icon={Link2}
            highlight={strongestConnection}
          />
        )}
      </div>
    </section>
  );
}
