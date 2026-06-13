type DashboardStatsProps = {
  memoryCount: number;
  currentPlan?: string | null;
  isPremium?: boolean;
};

export default function DashboardStats({
  memoryCount,
  currentPlan,
  isPremium = false,
}: DashboardStatsProps) {
  const normalizedPlan = currentPlan?.trim().toUpperCase();

  const displayPlan =
    isPremium || normalizedPlan === "PREMIUM"
      ? "Premium Plan"
      : "Free Plan";

  return (
    <div className="grid grid-cols-2 gap-6 max-md:gap-3">

      <div className="rounded-3xl border border-sand-deep/70 bg-white p-7 max-md:p-4 shadow-soft transition hover:shadow-soft-lg">

        <p className="text-xs font-medium uppercase tracking-wider text-charcoal-muted mb-3 max-md:mb-1">
          Total Memories
        </p>

        <h2 className="text-5xl font-semibold text-sage max-md:text-3xl">
          {memoryCount}
        </h2>

        <p className="text-sm text-charcoal-muted mt-3 max-md:text-xs max-md:mt-1">
          Your cognitive archive
          continues to grow.
        </p>

      </div>

      <div className="rounded-3xl border border-sand-deep/70 bg-white p-7 max-md:p-4 shadow-soft transition hover:shadow-soft-lg">

        <p className="text-xs font-medium uppercase tracking-wider text-charcoal-muted mb-3 max-md:mb-1">
          Subscription
        </p>

        <h2 className="text-3xl font-semibold text-charcoal max-md:text-2xl">
          {displayPlan}
        </h2>

        <p className="text-sm text-charcoal-muted mt-3 max-md:text-xs max-md:mt-1">
          {isPremium
            ? "Your premium subscription is active. Premium cognition features are enabled."
            : "Upgrade anytime for advanced AI cognition features."}
        </p>

      </div>

    </div>
  );
}