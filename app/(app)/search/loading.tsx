/** Search skeleton — search bar + filter chips + result rows. */
export default function SearchLoading() {
  return (
    <div className="space-y-3 p-4 md:p-6" aria-busy="true" aria-label="Loading search">
      <div className="h-11 w-full animate-pulse rounded-2xl bg-sand-deep/30" />
      <div className="flex gap-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-7 w-16 animate-pulse rounded-full bg-sand-deep/20" />
        ))}
      </div>
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="h-16 animate-pulse rounded-xl bg-sand-deep/20" />
      ))}
    </div>
  );
}
