/**
 * Reminders skeleton (Polaris Pass 8) — mirrors the page (serif header + add-reminder card +
 * Today's Focus hero + reminder cards). Brand tokens; reduced-motion-safe.
 */
export default function RemindersLoading() {
  return (
    <div
      className="mx-auto max-w-3xl px-4 py-8 md:px-6 md:py-10"
      aria-busy="true"
      aria-label="Loading reminders"
    >
      {/* Header */}
      <div className="mb-8 space-y-2">
        <div className="h-8 w-56 animate-pulse rounded-lg bg-sand-deep/30 motion-reduce:animate-none" />
        <div className="h-4 w-80 max-w-full animate-pulse rounded bg-sand-deep/20 motion-reduce:animate-none" />
      </div>

      {/* Add-reminder card */}
      <div className="mb-2 h-16 w-full animate-pulse rounded-3xl bg-sand-deep/20 motion-reduce:animate-none" />

      {/* Today's Focus hero */}
      <div className="mt-6 h-40 w-full animate-pulse rounded-3xl bg-sand-deep/20 motion-reduce:animate-none" />

      {/* Reminder cards */}
      <div className="mt-10 space-y-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-28 w-full animate-pulse rounded-3xl bg-sand-deep/20 motion-reduce:animate-none"
          />
        ))}
      </div>
    </div>
  );
}
