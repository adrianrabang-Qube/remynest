/** Dashboard skeleton — header + stat cards + widget blocks. */
export default function DashboardLoading() {
  return (
    <div className="space-y-4 p-4 md:p-6" aria-busy="true" aria-label="Loading dashboard">
      <div className="h-8 w-48 animate-pulse motion-reduce:animate-none rounded-lg bg-sand-deep/40" />
      <div className="grid grid-cols-2 gap-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-20 animate-pulse motion-reduce:animate-none rounded-2xl bg-sand-deep/20" />
        ))}
      </div>
      <div className="h-40 animate-pulse motion-reduce:animate-none rounded-3xl bg-sand-deep/20" />
      <div className="h-32 animate-pulse motion-reduce:animate-none rounded-3xl bg-sand-deep/20" />
    </div>
  );
}
