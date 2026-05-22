import UpgradeButton from "@/components/UpgradeButton";

type DashboardAccountStatusProps = {
  currentPlan?: string;
};

export default function DashboardAccountStatus({
  currentPlan = "Free Plan",
}: DashboardAccountStatusProps) {

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
            {currentPlan}
          </h3>

        </div>

        <p className="text-gray-500 leading-relaxed">
          Upgrade anytime for
          advanced AI cognition,
          semantic memory search,
          expanded storage,
          and premium RemyNest
          capabilities.
        </p>

        <UpgradeButton />

      </div>

    </div>
  );
}