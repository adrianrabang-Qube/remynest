import type { RemyUnderstanding } from "@/lib/remy/understanding";
import type { LensId, UnderstandingFacet } from "@/lib/remy/lenses/types";

const LENS_LABEL: Record<LensId, string> = {
  "life-journey": "Life Journey",
  themes: "Themes",
  relationships: "Relationships",
  story: "Story",
  preservation: "Preservation",
};

const LENS_ORDER: LensId[] = [
  "life-journey",
  "themes",
  "relationships",
  "story",
  "preservation",
];

/**
 * RemyLensSummary — a reusable renderer of lens-grouped understanding, shared
 * infrastructure for every Remy surface (Profile, People, Search, Remy Home,
 * Voice). It consumes the engine output directly and never re-derives logic.
 *
 *   • variant="inline"  — Remy's one-line summary (compact rows/cards).
 *   • variant="grouped" — facets grouped by lens (richer surfaces).
 */
export default function RemyLensSummary({
  understanding,
  variant = "inline",
  className = "",
}: {
  understanding: RemyUnderstanding;
  variant?: "inline" | "grouped";
  className?: string;
}) {
  if (variant === "inline") {
    return (
      <span className={`flex min-w-0 items-center gap-1.5 ${className}`}>
        <span aria-hidden className="shrink-0 text-sage">
          ✦
        </span>
        <span className="truncate">{understanding.summary}</span>
      </span>
    );
  }

  const byLens = new Map<LensId, UnderstandingFacet[]>();
  for (const facet of understanding.facets) {
    const existing = byLens.get(facet.lensId) ?? [];
    existing.push(facet);
    byLens.set(facet.lensId, existing);
  }
  const groups = LENS_ORDER.filter((id) => byLens.has(id));

  if (groups.length === 0) {
    return (
      <p className={`text-sm text-charcoal-soft ${className}`}>
        {understanding.summary}
      </p>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {groups.map((id) => {
        const facets = byLens.get(id) ?? [];
        return (
          <section key={id} aria-label={LENS_LABEL[id]}>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-charcoal-muted">
              {LENS_LABEL[id]}
            </p>
            <ul className="mt-1 space-y-0.5">
              {facets.map((facet) => (
                <li key={facet.kind} className="text-sm text-charcoal">
                  {facet.label}
                  {facet.detail && (
                    <span className="text-charcoal-muted"> · {facet.detail}</span>
                  )}
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
