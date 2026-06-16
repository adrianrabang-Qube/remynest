/** Remy (My Nest) skeleton — header + Ask box + suggestion cards. */
export default function RemyLoading() {
  return (
    <div
      className="mx-auto w-full max-w-3xl space-y-4 p-4 md:p-6"
      aria-busy="true"
      aria-label="Loading Remy"
    >
      <div className="h-8 w-32 animate-pulse rounded-lg bg-sand-deep/40" />
      <div className="h-28 animate-pulse rounded-3xl bg-sand-deep/20" />
      <div className="h-20 animate-pulse rounded-3xl bg-sand-deep/20" />
      <div className="h-14 animate-pulse rounded-2xl bg-sand-deep/30" />
    </div>
  );
}
