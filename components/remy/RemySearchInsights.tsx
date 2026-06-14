import type { SearchHealth } from "@/lib/remy/search-health";

/**
 * RemySearchInsights — a small, factual readout of how discoverable the memory
 * corpus is (from lib/remy/search-health.ts). Facts only: no coaching, no
 * recommendations, no AI. Renders nothing when there are no memories.
 */
export default function RemySearchInsights({
  health,
}: {
  health: SearchHealth;
}) {
  if (health.total === 0) return null;

  const facts = [
    `${health.datedPercentage}% searchable by date`,
    `${health.categorized} categorized`,
    `${health.tagged} tagged`,
  ];

  return (
    <section
      aria-label="Search insights"
      className="rounded-2xl border border-sand-deep/70 bg-white p-3 shadow-soft md:p-4"
    >
      <p className="text-[11px] font-semibold uppercase tracking-wide text-charcoal-muted">
        Search insights
      </p>
      <p className="mt-1 text-sm text-charcoal-soft">
        {health.total} {health.total === 1 ? "memory" : "memories"} ·{" "}
        {facts.join(" · ")}
      </p>
      {(health.missingCategories > 0 || health.missingDates > 0) && (
        <p className="mt-0.5 text-xs text-charcoal-muted">
          {health.missingDates} missing dates · {health.missingCategories}{" "}
          missing categories
        </p>
      )}
    </section>
  );
}
