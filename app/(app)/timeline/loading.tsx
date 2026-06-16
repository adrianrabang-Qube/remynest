/** Timeline skeleton — header + chronological rows. */
export default function TimelineLoading() {
  return (
    <div className="space-y-3 p-4 md:p-6" aria-busy="true" aria-label="Loading timeline">
      <div className="h-8 w-40 animate-pulse rounded-lg bg-sand-deep/40" />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="h-16 animate-pulse rounded-xl bg-sand-deep/20" />
      ))}
    </div>
  );
}
