/**
 * Search skeleton (Polaris Pass 4) — mirrors the redesigned layout (serif title + insights
 * readout + pill search field + discovery hero). Brand tokens; reduced-motion-safe.
 */
export default function SearchLoading() {
  return (
    <div
      className="mx-auto w-full max-w-3xl space-y-4"
      aria-busy="true"
      aria-label="Loading search"
    >
      {/* Title */}
      <div className="space-y-2">
        <div className="h-8 w-32 animate-pulse rounded-lg bg-sand-deep/30 motion-reduce:animate-none" />
        <div className="h-4 w-72 max-w-full animate-pulse rounded bg-sand-deep/20 motion-reduce:animate-none" />
      </div>

      {/* Search insights readout */}
      <div className="h-16 w-full animate-pulse rounded-2xl bg-sand-deep/20 motion-reduce:animate-none" />

      {/* Search field (pill) */}
      <div className="h-12 w-full animate-pulse rounded-full bg-sand-deep/30 motion-reduce:animate-none" />

      {/* Discovery hero */}
      <div className="h-56 w-full animate-pulse rounded-3xl bg-sand-deep/20 motion-reduce:animate-none" />
    </div>
  );
}
