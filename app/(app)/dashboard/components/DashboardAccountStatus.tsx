import UpgradeButton from "@/components/UpgradeButton";

type DashboardAccountStatusProps = {
  currentPlan?: string | null;
  isPremium?: boolean;
};

export default function DashboardAccountStatus({
  currentPlan,
  isPremium = false,
}: DashboardAccountStatusProps) {
  console.info("[DashboardAccountStatus] props", {
    currentPlan,
    isPremium,
  });

  const normalizedPlan = currentPlan?.trim().toUpperCase();

  const isFamily = normalizedPlan === "FAMILY";
  const isPremiumPlan = normalizedPlan === "PREMIUM";
  const isFree = !isFamily && !isPremiumPlan;

  const displayPlan = isFamily
    ? "Family Plan"
    : isPremiumPlan
    ? "Premium Plan"
    : "Free Plan";

  return (
    <div className="rounded-3xl border border-sand-deep/70 bg-white p-7 shadow-soft">
      <h2 className="text-2xl font-semibold mb-5 text-charcoal">
        Account Status
      </h2>

      <div className="space-y-5">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-charcoal-muted mb-2">
            Subscription Tier
          </p>

          <h3 className="text-3xl font-semibold text-charcoal">
            {displayPlan}
          </h3>
        </div>

        <p className="text-charcoal-soft leading-relaxed">
          {isFamily
            ? "Your Family subscription is active. Collaboration, shared caregiving, and expanded family features are enabled."
            : isPremiumPlan
            ? "Your premium subscription is active. Advanced cognition, semantic search, and expanded features are enabled."
            : "Upgrade anytime for advanced AI cognition, semantic memory search, expanded storage, and premium RemyNest capabilities."}
        </p>

        {isFree && <UpgradeButton />}
      </div>
    </div>
  );
}