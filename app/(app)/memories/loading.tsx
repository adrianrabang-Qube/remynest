/** Memories skeleton — search bar + compact rows. */
export default function MemoriesLoading() {
  return (
    <div className="space-y-3 p-4 md:p-6" aria-busy="true" aria-label="Loading memories">
      <div className="h-11 w-full animate-pulse motion-reduce:animate-none rounded-2xl bg-sand-deep/30" />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="h-20 animate-pulse motion-reduce:animate-none rounded-2xl bg-sand-deep/20" />
      ))}
    </div>
  );
}
