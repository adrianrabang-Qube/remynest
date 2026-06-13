import Link from "next/link";

interface ProfileCoverageCardProps {
  firstDate?: string | null;
  latestDate?: string | null;
  percentage: number;
  total: number;
  dated: number;
}

function formatDate(value?: string | null) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, {
    month: "short",
    year: "numeric",
  });
}

/**
 * ProfileCoverageCard — memory date coverage: first/latest memory dates and the
 * dated-coverage percentage (reuses Remy's computeCoverage). Read-only.
 */
export default function ProfileCoverageCard({
  firstDate,
  latestDate,
  percentage,
  total,
  dated,
}: ProfileCoverageCardProps) {
  const first = formatDate(firstDate);
  const latest = formatDate(latestDate);
  const pct = Math.max(0, Math.min(100, Math.round(percentage)));

  return (
    <section className="rounded-3xl border border-sand-deep/70 bg-white p-4 shadow-soft md:p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-charcoal">Memory coverage</h2>
        <Link
          href="/memory-dates"
          className="text-sm font-semibold text-sage-deep hover:underline"
        >
          Add dates →
        </Link>
      </div>

      {(first || latest) && (
        <p className="mt-2 text-sm text-charcoal-soft">
          {first ?? "—"} <span aria-hidden>→</span> {latest ?? "—"}
        </p>
      )}

      <div className="mt-3">
        <div className="flex items-baseline justify-between text-sm">
          <span className="font-medium text-charcoal">{pct}% dated</span>
          <span className="text-xs text-charcoal-muted">
            {dated} of {total} memories
          </span>
        </div>
        <div
          className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-sand-deep/40"
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Dated memory coverage"
        >
          <div className="h-full rounded-full bg-sage" style={{ width: `${pct}%` }} />
        </div>
      </div>
    </section>
  );
}
