/**
 * Settings skeleton (Polaris Pass 7) — mirrors the page (serif title + profile header + the
 * account/storage/export/privacy/danger sections). Brand tokens; reduced-motion-safe.
 */
export default function SettingsLoading() {
  return (
    <div
      className="mx-auto max-w-2xl px-4 py-8"
      aria-busy="true"
      aria-label="Loading settings"
    >
      {/* Title */}
      <div className="mb-6 space-y-2">
        <div className="h-8 w-32 animate-pulse rounded-lg bg-sand-deep/30 motion-reduce:animate-none" />
        <div className="h-4 w-72 max-w-full animate-pulse rounded bg-sand-deep/20 motion-reduce:animate-none" />
      </div>

      {/* Profile header */}
      <div className="mb-6 flex items-center gap-4 border-b border-sand-deep/40 pb-4">
        <div className="h-14 w-14 shrink-0 animate-pulse rounded-full bg-sand-deep/25 motion-reduce:animate-none" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-40 animate-pulse rounded bg-sand-deep/25 motion-reduce:animate-none" />
          <div className="h-3 w-24 animate-pulse rounded bg-sand-deep/20 motion-reduce:animate-none" />
        </div>
      </div>

      {/* Sections */}
      <div className="mt-6 space-y-6">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="space-y-3">
            <div className="h-3 w-32 animate-pulse rounded bg-sand-deep/25 motion-reduce:animate-none" />
            <div className="h-24 w-full animate-pulse rounded-2xl bg-sand-deep/20 motion-reduce:animate-none" />
          </div>
        ))}
      </div>
    </div>
  );
}
