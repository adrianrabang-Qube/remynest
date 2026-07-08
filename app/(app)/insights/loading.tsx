/**
 * Insights skeleton (Polaris Pass 3) — mirrors the redesigned calm above-the-fold (header +
 * disclaimer + companion summary + AI interpretation + the collapsed "Detailed analytics"
 * header), NOT the old analytics grid. Brand tokens; reduced-motion-safe.
 */
export default function LoadingInsightsPage() {
  return (
    <main
      className="min-h-screen bg-sand"
      aria-busy="true"
      aria-label="Loading insights"
    >
      <section className="mx-auto w-full max-w-4xl space-y-6 px-4 py-6 sm:px-6">
        {/* Header */}
        <div className="space-y-3">
          <div className="h-8 w-44 animate-pulse rounded-full bg-sand-deep/30 motion-reduce:animate-none" />
          <div className="h-10 w-72 max-w-full animate-pulse rounded-2xl bg-sand-deep/30 motion-reduce:animate-none" />
          <div className="h-5 w-96 max-w-full animate-pulse rounded bg-sand-deep/20 motion-reduce:animate-none" />
        </div>

        {/* Disclaimer + companion summary + AI interpretation + collapsed analytics header */}
        <div className="h-14 w-full animate-pulse rounded-2xl bg-sand-deep/20 motion-reduce:animate-none" />
        <div className="h-48 w-full animate-pulse rounded-3xl bg-sand-deep/20 motion-reduce:animate-none" />
        <div className="h-40 w-full animate-pulse rounded-3xl bg-sand-deep/20 motion-reduce:animate-none" />
        <div className="h-20 w-full animate-pulse rounded-3xl bg-sand-deep/20 motion-reduce:animate-none" />
      </section>
    </main>
  );
}
