import Link from "next/link";

interface ProfileLifeSnapshotProps {
  memories: number;
  collections: number;
  connections: number;
  chapters: number;
}

const STATS = [
  { key: "memories", label: "Memories", href: "/memories" },
  { key: "collections", label: "Collections", href: "/collections" },
  { key: "connections", label: "Connections", href: "/connections" },
  { key: "chapters", label: "Chapters", href: "/chapters" },
] as const;

/**
 * ProfileLifeSnapshot — counts only, as compact tappable cards (2-up on mobile,
 * 4-up on desktop). Each links to its surface. No content, just the shape of a
 * life.
 */
export default function ProfileLifeSnapshot({
  memories,
  collections,
  connections,
  chapters,
}: ProfileLifeSnapshotProps) {
  const values: Record<string, number> = {
    memories,
    collections,
    connections,
    chapters,
  };

  return (
    <section aria-label="Life snapshot">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {STATS.map((stat) => (
          <Link
            key={stat.key}
            href={stat.href}
            className="rounded-2xl border border-sand-deep/70 bg-white p-4 shadow-soft transition hover:shadow-soft-lg"
          >
            <p className="text-2xl font-semibold text-sage">
              {values[stat.key]}
            </p>
            <p className="mt-0.5 text-xs font-medium uppercase tracking-wide text-charcoal-muted">
              {stat.label}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
