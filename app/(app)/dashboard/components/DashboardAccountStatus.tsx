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
    <div className="rounded-3xl border bg-white p-6 shadow-sm">
      <h2 className="text-2xl font-semibold mb-4 text-[#2f3e34]">
        Account Status
      </h2>

      <div className="space-y-5">
        <div>
          <p className="text-gray-600 mb-2">
            Subscription Tier
          </p>

          <h3 className="text-3xl font-bold text-[#2f3e34]">
            {displayPlan}
          </h3>
        </div>

        <p className="text-gray-500 leading-relaxed">
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