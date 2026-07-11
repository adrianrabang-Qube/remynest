type DashboardTelemetryProps = {
  memoryCount: number;
  activeProfileName?: string | null;
};

export default function DashboardTelemetry({
  memoryCount,
  activeProfileName,
}: DashboardTelemetryProps) {
  const profileContext =
    activeProfileName
      ? `Active profile: ${activeProfileName}`
      : "Active archive overview.";

  return (
    <div className="rounded-3xl border bg-white p-6 shadow-sm">

      <h2 className="text-2xl font-semibold mb-6 text-[#2f3e34]">
        Cognitive Insights
      </h2>

      <div className="grid gap-5">

        <div className="rounded-2xl border bg-[#faf8f4] p-5">

          <p className="text-gray-500 mb-2">
            Active Archive
          </p>

          <h3 className="text-4xl font-bold text-[#2f3e34]">
            {memoryCount}
          </h3>

          <p className="text-sm text-charcoal-soft mt-3">
            Stored cognitive memories
            across your RemyNest archive.
          </p>

          <p className="text-sm text-gray-500 mt-2">
            {profileContext}
          </p>

        </div>

      </div>

    </div>
  );
}