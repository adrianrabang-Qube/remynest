/**
 * Activities route skeleton — brand-token, reduced-motion-safe (mirrors the
 * landing layout: header → Remy intro card → two card shelves).
 */
export default function ActivitiesLoading() {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8" aria-hidden>
      <div className="h-8 w-56 animate-pulse rounded-lg bg-sand-deep/60 motion-reduce:animate-none" />
      <div className="mt-2 h-4 w-72 animate-pulse rounded bg-sand-deep/40 motion-reduce:animate-none" />

      <div className="mt-6 flex items-center gap-4 rounded-3xl border border-sand-deep/50 bg-white p-5">
        <div className="h-[72px] w-[72px] shrink-0 animate-pulse rounded-2xl bg-sand-deep/40 motion-reduce:animate-none" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-3/4 animate-pulse rounded bg-sand-deep/40 motion-reduce:animate-none" />
          <div className="h-4 w-1/2 animate-pulse rounded bg-sand-deep/30 motion-reduce:animate-none" />
        </div>
      </div>

      {[3, 2].map((rows, i) => (
        <div key={i} className="mt-8 space-y-3">
          <div className="h-5 w-40 animate-pulse rounded bg-sand-deep/50 motion-reduce:animate-none" />
          {Array.from({ length: rows }).map((_, j) => (
            <div
              key={j}
              className="flex items-center gap-4 rounded-3xl border border-sand-deep/50 bg-white p-4"
            >
              <div className="h-12 w-12 shrink-0 animate-pulse rounded-2xl bg-sand-deep/40 motion-reduce:animate-none" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-1/3 animate-pulse rounded bg-sand-deep/40 motion-reduce:animate-none" />
                <div className="h-3 w-2/3 animate-pulse rounded bg-sand-deep/30 motion-reduce:animate-none" />
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
