import Link from "next/link";

/**
 * Dashboard invitation to Reminiscence Mode — shown when dated memories exist.
 * Calm, warm, caregiver-facing.
 */
export default function ReminisceDashboardCard({
  datedCount,
}: {
  datedCount: number;
}) {
  return (
    <section className="rounded-3xl border border-primary/25 bg-gradient-to-br from-primary/[0.08] to-sand/40 p-6 shadow-soft">
      <div className="flex items-start gap-3">
        <span aria-hidden="true" className="text-2xl leading-none">
          🕰
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold text-charcoal">
            Reminisce together
          </h2>
          <p className="mt-1 text-sm text-charcoal-soft">
            Revisit memories from the past, one era at a time — a calm way to
            look back together. {datedCount} dated{" "}
            {datedCount === 1 ? "memory" : "memories"} ready.
          </p>
          <Link
            href="/reminisce"
            className="mt-4 inline-flex items-center rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-soft transition hover:bg-primary-deep"
          >
            Start reminiscing
          </Link>
        </div>
      </div>
    </section>
  );
}
