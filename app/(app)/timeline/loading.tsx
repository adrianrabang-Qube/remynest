/**
 * Timeline skeleton (Polaris Pass 5) — mirrors the redesigned layout (serif header + control
 * bar + a dated group of cards). Brand tokens; reduced-motion-safe.
 */
export default function TimelineLoading() {
  return (
    <div
      className="mx-auto max-w-3xl space-y-6 p-6 max-md:space-y-4 max-md:p-4"
      aria-busy="true"
      aria-label="Loading timeline"
    >
      {/* Header */}
      <div className="space-y-2">
        <div className="h-8 w-40 animate-pulse rounded-lg bg-sand-deep/30 motion-reduce:animate-none" />
        <div className="h-4 w-64 max-w-full animate-pulse rounded bg-sand-deep/20 motion-reduce:animate-none" />
      </div>

      {/* Control bar */}
      <div className="space-y-3">
        <div className="h-9 w-56 animate-pulse rounded-2xl bg-sand-deep/25 motion-reduce:animate-none" />
        <div className="h-12 w-full animate-pulse rounded-3xl bg-sand-deep/20 motion-reduce:animate-none" />
        <div className="flex gap-2">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-8 w-20 animate-pulse rounded-full bg-sand-deep/20 motion-reduce:animate-none"
            />
          ))}
        </div>
      </div>

      {/* Dated group of cards */}
      <div className="h-4 w-28 animate-pulse rounded bg-sand-deep/25 motion-reduce:animate-none" />
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="h-40 w-full animate-pulse rounded-3xl bg-sand-deep/20 motion-reduce:animate-none"
        />
      ))}
    </div>
  );
}
