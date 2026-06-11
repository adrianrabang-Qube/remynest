import Link from "next/link";
import type { RemyCollection } from "@/lib/remy/collections";

/**
 * Remy Collections (dashboard section) — "Organize".
 *
 * Surfaces the top existing collections beneath the Companion + Activity. Purely
 * presentational; hides itself when there's nothing to organize yet (graceful).
 */
export default function RemyCollections({
  collections,
}: {
  collections: RemyCollection[];
}) {
  if (collections.length === 0) return null;

  return (
    <section className="rounded-3xl border border-sand-deep/70 bg-white p-6 shadow-soft">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-lg font-semibold text-charcoal">
          Remy Collections
        </h2>
        <Link
          href="/collections"
          className="text-xs font-semibold text-sage-deep underline-offset-2 hover:underline"
        >
          View all collections →
        </Link>
      </div>

      <p className="mt-1 text-sm text-charcoal-soft">
        I&apos;ve started organizing memories into collections.
      </p>

      <ul className="mt-4 grid gap-3 sm:grid-cols-2">
        {collections.map((c) => (
          <li key={c.id}>
            <Link
              href={`/collections/${c.id}`}
              className="block rounded-2xl border border-sand-deep/60 px-4 py-3 transition hover:bg-sand/40"
            >
              <p className="font-medium text-charcoal break-words">
                {c.title}
              </p>
              <p className="text-sm text-charcoal-muted">
                {c.memoryCount}{" "}
                {c.memoryCount === 1 ? "memory" : "memories"}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
