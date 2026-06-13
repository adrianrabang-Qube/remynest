import Link from "next/link";
import {
  formatCollectionRange,
  type RemyCollection,
} from "@/lib/remy/collections";

/**
 * Collection card — a visual, human-readable summary of a memory collection.
 * Reused on the Collections page (and shaped to be reusable by future Life
 * Chapters). No internal grouping language ever appears here.
 */
export default function CollectionCard({
  collection,
}: {
  collection: RemyCollection;
}) {
  const range = formatCollectionRange(collection);

  return (
    <Link
      href={`/collections/${collection.id}`}
      className="block rounded-3xl border border-sand-deep/70 bg-white p-4 md:p-6 shadow-soft transition hover:-translate-y-0.5 hover:shadow-soft-lg"
    >
      <h3 className="text-lg font-semibold text-charcoal break-words">
        {collection.title}
      </h3>

      <p className="mt-1 text-sm text-charcoal-soft">
        {collection.memoryCount}{" "}
        {collection.memoryCount === 1 ? "memory" : "memories"}
      </p>

      {range && (
        <p className="mt-2 text-sm font-medium text-sage-deep">{range}</p>
      )}

      {collection.emotionalThemes.length > 0 && (
        <p className="mt-3 text-xs text-charcoal-muted">
          {collection.emotionalThemes.join(" • ")}
        </p>
      )}
    </Link>
  );
}
