/**
 * Generic loading skeleton for any (app) route without its own loading.tsx.
 * Shown during client-side RSC route transitions so navigation never flashes a
 * blank screen (Mobile Experience Sprint V1).
 */
export default function Loading() {
  return (
    <div className="space-y-4 p-4 md:p-6" aria-busy="true" aria-label="Loading">
      <div className="h-7 w-40 animate-pulse rounded-lg bg-sand-deep/40" />
      <div className="h-4 w-64 animate-pulse rounded bg-sand-deep/30" />
      <div className="space-y-3 pt-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-2xl bg-sand-deep/20" />
        ))}
      </div>
    </div>
  );
}
