/**
 * Library skeleton (Polaris Pass 6) — mirrors the hub (serif title + search + filter chips +
 * destination rows). Brand tokens; reduced-motion-safe.
 */
export default function LibraryLoading() {
  return (
    <div
      className="mx-auto max-w-2xl space-y-4 p-4 md:space-y-6 md:p-6"
      aria-busy="true"
      aria-label="Loading library"
    >
      {/* Title */}
      <div className="space-y-2">
        <div className="h-8 w-32 animate-pulse rounded-lg bg-sand-deep/30 motion-reduce:animate-none" />
        <div className="h-4 w-72 max-w-full animate-pulse rounded bg-sand-deep/20 motion-reduce:animate-none" />
      </div>

      {/* Search */}
      <div className="h-11 w-full animate-pulse rounded-full bg-sand-deep/25 motion-reduce:animate-none" />

      {/* Filter chips */}
      <div className="flex gap-2">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-8 w-20 animate-pulse rounded-full bg-sand-deep/20 motion-reduce:animate-none"
          />
        ))}
      </div>

      {/* Destination rows */}
      <div className="divide-y divide-sand-deep/40 overflow-hidden rounded-3xl border border-sand-deep/60 bg-white shadow-soft">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-3 px-3 py-3">
            <div className="h-11 w-11 shrink-0 animate-pulse rounded-xl bg-sand-deep/25 motion-reduce:animate-none" />
            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="h-4 w-28 animate-pulse rounded bg-sand-deep/25 motion-reduce:animate-none" />
              <div className="h-3 w-48 max-w-full animate-pulse rounded bg-sand-deep/20 motion-reduce:animate-none" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
