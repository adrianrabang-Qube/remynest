interface ProfilePersonSnapshotProps {
  memories: number;
  collections: number;
  chapters: number;
  dated: number;
}

/**
 * ProfilePersonSnapshot — profile-scoped counts for one person, derived from
 * getFamilyIntelligence (which scopes by memory_profile_id). Counts only, no
 * cross-workspace links (those would resolve to whatever workspace is active,
 * not this person). Connections are intentionally absent — RemyNest has no
 * profile-scoped connection count today.
 */
export default function ProfilePersonSnapshot({
  memories,
  collections,
  chapters,
  dated,
}: ProfilePersonSnapshotProps) {
  const stats = [
    { label: "Memories", value: memories },
    { label: "Collections", value: collections },
    { label: "Chapters", value: chapters },
    { label: "Dated", value: dated },
  ];

  return (
    <section aria-label="Life snapshot">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-2xl border border-sand-deep/70 bg-white p-4 shadow-soft"
          >
            <p className="text-2xl font-semibold text-sage">{s.value}</p>
            <p className="mt-0.5 text-xs font-medium uppercase tracking-wide text-charcoal-muted">
              {s.label}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
