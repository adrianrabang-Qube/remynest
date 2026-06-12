import Link from "next/link";
import type { DateCoverage } from "@/lib/remy/date-coverage";

/**
 * Dashboard nudge to date memories — shown when coverage is low. Helps Remy
 * understand when memories happened, which powers the timeline + historical
 * intelligence. Human, calm, never technical.
 */
export default function DateCompletionCard({
  coverage,
}: {
  coverage: DateCoverage;
}) {
  return (
    <section className="rounded-3xl border border-gold/40 bg-gold/[0.07] p-6 shadow-soft">
      <div className="flex items-start gap-3">
        <span aria-hidden="true" className="text-2xl leading-none">
          🕰
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold text-charcoal">
            Help Remy understand when memories happened.
          </h2>
          <p className="mt-1 text-sm text-charcoal-soft">
            Adding dates lets Remy place memories on the timeline and notice
            meaningful moments from the past.
          </p>

          <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Memories" value={coverage.total} />
            <Stat label="Dated" value={coverage.dated} />
            <Stat label="Missing dates" value={coverage.missing} />
            <Stat label="Complete" value={`${coverage.percentage}%`} />
          </dl>

          <Link
            href="/memory-dates"
            className="mt-5 inline-flex items-center rounded-full bg-sage px-5 py-2.5 text-sm font-semibold text-white shadow-soft transition hover:bg-sage-deep"
          >
            Add memory dates
          </Link>
        </div>
      </div>
    </section>
  );
}

function Stat({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div className="rounded-2xl bg-white px-3 py-2.5">
      <dt className="text-xs text-charcoal-muted">{label}</dt>
      <dd className="text-lg font-semibold text-charcoal">{value}</dd>
    </div>
  );
}
