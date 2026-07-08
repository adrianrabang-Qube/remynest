/**
 * Home skeleton (Project Polaris Pass 2) — a calm placeholder shown while the Remy home
 * model resolves, mirroring the page's shape (header + entry + cards). Decorative; honors
 * prefers-reduced-motion.
 */
export default function HomeLoading() {
  return (
    <div
      className="mx-auto max-w-2xl space-y-4 p-4 md:space-y-5 md:p-6"
      aria-busy="true"
      aria-label="Loading home"
    >
      <div className="space-y-2">
        <div className="h-8 w-32 animate-pulse rounded-lg bg-sand-deep/30 motion-reduce:animate-none" />
        <div className="h-4 w-64 max-w-full animate-pulse rounded bg-sand-deep/20 motion-reduce:animate-none" />
      </div>

      <div className="h-12 w-full animate-pulse rounded-2xl bg-sand-deep/20 motion-reduce:animate-none" />

      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="h-28 w-full animate-pulse rounded-3xl bg-sand-deep/20 motion-reduce:animate-none"
        />
      ))}
    </div>
  );
}
