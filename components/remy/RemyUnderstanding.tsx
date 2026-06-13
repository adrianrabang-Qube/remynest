import Link from "next/link";
import {
  BookOpen,
  CalendarRange,
  ChevronRight,
  Clock,
  Feather,
  FolderHeart,
  History,
  Link2,
  ScrollText,
  Sparkles,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import RemyAvatar from "@/components/remy/RemyAvatar";
import type {
  RemyUnderstanding as RemyUnderstandingModel,
  UnderstandingFacetKind,
} from "@/lib/remy/understanding";

const KIND_ICON: Record<UnderstandingFacetKind, LucideIcon> = {
  "life-areas": FolderHeart,
  "strongest-period": Clock,
  "chapter-span": CalendarRange,
  "story-ready": ScrollText,
  "narrative-growth": Feather,
  coverage: BookOpen,
  recency: History,
  "missing-knowledge": Sparkles,
  relationship: Link2,
};

/**
 * RemyUnderstanding — the first renderer of the understanding engine
 * (lib/remy/understanding.ts). It presents Remy's point of view about a subject
 * as the lead of a surface: an opening line in Remy's voice + a list of facets,
 * each bridging into the supporting evidence (Themes, Life Journey, Story…).
 *
 * Renderer-agnostic by design: it draws whatever facets the engine produced, so
 * other surfaces (Search, Remy home, People rows) can reuse it unchanged.
 */
export default function RemyUnderstanding({
  understanding,
}: {
  understanding: RemyUnderstandingModel;
}) {
  const { subject, facets, isNascent } = understanding;

  return (
    <section
      aria-label={`Remy's understanding of ${subject.name}`}
      className="rounded-3xl border border-sand-deep/70 bg-gradient-to-b from-sage/5 to-white p-4 shadow-soft md:p-6"
    >
      <div className="flex items-center gap-3">
        <RemyAvatar size="sm" />
        <h2 className="min-w-0 text-base font-semibold text-charcoal md:text-lg">
          {isNascent
            ? `Remy is just getting to know ${subject.name}`
            : `Remy understands ${subject.name} as…`}
        </h2>
      </div>

      {facets.length === 0 ? (
        <p className="mt-3 text-sm leading-relaxed text-charcoal-soft">
          Add a few memories and Remy will begin to understand {subject.name}
          &rsquo;s life — the themes, the chapters, and the moments that matter.
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-sand-deep/30">
          {facets.map((facet) => {
            const Icon = KIND_ICON[facet.kind];
            const inner = (
              <>
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sage/10 text-sage">
                  <Icon className="h-5 w-5" aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-charcoal">
                    {facet.label}
                  </p>
                  {facet.detail && (
                    <p className="truncate text-xs text-charcoal-muted">
                      {facet.detail}
                    </p>
                  )}
                </div>
                {facet.lens && (
                  <ChevronRight
                    className="h-4 w-4 shrink-0 text-charcoal-muted"
                    aria-hidden
                  />
                )}
              </>
            );

            return (
              <li key={facet.kind}>
                {facet.lens ? (
                  <Link
                    href={facet.lens.href}
                    aria-label={`${facet.label} — ${facet.lens.label}`}
                    className="flex min-h-[44px] items-center gap-3 py-2.5 transition hover:bg-sand/30"
                  >
                    {inner}
                  </Link>
                ) : (
                  <div className="flex min-h-[44px] items-center gap-3 py-2.5">
                    {inner}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
