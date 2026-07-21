import RemyAvatar from "@/components/remy/RemyAvatar";
import RemyLensSummary from "@/components/remy/RemyLensSummary";
import type { RemyUnderstanding } from "@/lib/remy/understanding";
import type { RemyObservation } from "@/lib/remy/types";

/**
 * RemyHomeSummary — workspace/family-level "What Remy understands", the
 * foundation of the future Remy Home. It renders the workspace understanding
 * (lens-grouped, via the shared RemyLensSummary) and can optionally surface
 * fused observations (understanding-derived + signal-derived) — the seam for
 * Remy Home / Voice. No duplicated logic; consumes engine output directly.
 */
export default function RemyHomeSummary({
  understanding,
  observations,
}: {
  understanding: RemyUnderstanding;
  observations?: RemyObservation[];
}) {
  return (
    /* COMPANION surface — Remy's understanding, so it carries the remy.* palette. */
    <section
      aria-label="What Remy understands"
      className="rounded-3xl border border-remy-lavender/20 bg-gradient-to-b from-remy-lavender/5 to-white p-4 shadow-soft md:p-6"
    >
      <div className="flex items-center gap-3">
        <RemyAvatar size="sm" />
        <h2 className="text-base font-semibold text-charcoal md:text-lg">
          What Remy understands
        </h2>
      </div>

      <div className="mt-3">
        <RemyLensSummary understanding={understanding} variant="grouped" />
      </div>

      {observations && observations.length > 0 && (
        <ul className="mt-4 space-y-1.5 border-t border-remy-lavender/15 pt-3">
          {observations.slice(0, 3).map((o) => (
            <li
              key={o.id}
              className="flex gap-2 text-sm leading-relaxed text-charcoal-soft"
            >
              <span
                aria-hidden
                className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-remy-lavender"
              />
              <span>{o.text}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
