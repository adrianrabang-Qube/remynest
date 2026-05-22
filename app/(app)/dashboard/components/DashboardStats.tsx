type DashboardStatsProps = {
  memoryCount: number;
};

export default function DashboardStats({
  memoryCount,
}: DashboardStatsProps) {
  return (
    <div className="grid md:grid-cols-2 gap-6">

      <div className="rounded-3xl border bg-white p-6 shadow-sm">

        <p className="text-gray-500 mb-3">
          Total Memories
        </p>

        <h2 className="text-5xl font-bold text-[#2f3e34]">
          {memoryCount}
        </h2>

        <p className="text-sm text-gray-400 mt-3">
          Your cognitive archive
          continues to grow.
        </p>

      </div>

      <div className="rounded-3xl border bg-white p-6 shadow-sm">

        <p className="text-gray-500 mb-3">
          Subscription
        </p>

        <h2 className="text-3xl font-semibold text-[#2f3e34]">
          Free Plan
        </h2>

        <p className="text-sm text-gray-400 mt-3">
          Upgrade anytime for
          advanced AI cognition
          features.
        </p>

      </div>

    </div>
  );
}