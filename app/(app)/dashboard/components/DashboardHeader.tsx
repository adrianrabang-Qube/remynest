type DashboardHeaderProps = {
  greeting: string;
  displayName: string;
};

export default function DashboardHeader({
  greeting,
  displayName,
}: DashboardHeaderProps) {
  return (
    <div className="space-y-4">

      <div className="inline-flex items-center rounded-full bg-white border px-4 py-2 text-sm text-gray-600 shadow-sm">
        AI Cognitive Memory Assistant
      </div>

      <div>

        <h1 className="text-5xl font-bold tracking-tight text-[#2f3e34] mb-4">
          {greeting},{" "}
          {displayName}
        </h1>

        <p className="text-xl text-gray-600 max-w-2xl leading-relaxed">
          Welcome back to RemyNest.
          Your memories, reminders,
          and cognitive insights are
          ready for today.
        </p>

      </div>

    </div>
  );
}