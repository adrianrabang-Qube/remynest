import Link from "next/link";
import type { RemyConnection } from "@/lib/remy/connections";

/**
 * Connections Remy Found (dashboard section). Surfaces memories that appear to
 * be part of the same story. Presentational; hides when there's nothing yet.
 */
export default function RemyConnections({
  connections,
}: {
  connections: RemyConnection[];
}) {
  if (connections.length === 0) return null;

  return (
    <section className="rounded-3xl border border-sand-deep/70 bg-white p-4 md:p-6 shadow-soft">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-lg font-semibold text-charcoal">
          Connections Remy Found
        </h2>
        <Link
          href="/connections"
          className="text-xs font-semibold text-primary-deep underline-offset-2 hover:underline"
        >
          View all connections →
        </Link>
      </div>

      <p className="mt-1 text-sm text-charcoal-soft">
        Memories that may be part of the same story.
      </p>

      <ul className="mt-4 max-md:mt-3 grid grid-cols-2 gap-3 max-md:gap-2">
        {connections.map((c) => (
          <li key={c.id}>
            <Link
              href={`/connections/${c.id}`}
              className="block rounded-2xl border border-sand-deep/60 px-4 py-3 transition hover:bg-sand/40"
            >
              <p className="font-medium text-charcoal break-words">
                {c.title}
              </p>
              <p className="text-sm text-charcoal-soft break-words">
                {c.summary}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
