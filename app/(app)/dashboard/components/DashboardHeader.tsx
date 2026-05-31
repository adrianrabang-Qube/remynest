type DashboardHeaderProps = {
  greeting: string;
  displayName: string;
  workspaceType?: "care" | "my-nest";
  workspaceLabel?: string;
};

export default function DashboardHeader({
  greeting,
  displayName,
  workspaceType = "care",
  workspaceLabel,
}: DashboardHeaderProps) {
  return (
    <div className="space-y-4">

      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex items-center rounded-full bg-white border px-4 py-2 text-sm text-gray-600 shadow-sm">
          AI Cognitive Memory Assistant
        </div>

        <div className={`inline-flex items-center rounded-full px-4 py-2 text-sm font-medium shadow-sm border ${
          workspaceType === "my-nest"
            ? "bg-indigo-50 border-indigo-200 text-indigo-700"
            : "bg-emerald-50 border-emerald-200 text-emerald-700"
        }`}>
          {workspaceType === "my-nest"
            ? "MY NEST WORKSPACE"
            : "CARE WORKSPACE"}
        </div>
      </div>

      <div>

        <h1 className="text-5xl font-bold tracking-tight text-[#2f3e34] mb-4">
          {greeting},{" "}
          {displayName}
        </h1>

        <p className="text-xl text-gray-600 max-w-2xl leading-relaxed">
          {workspaceLabel ?? "Welcome back to RemyNest."}
          {" "}
          Your memories, reminders,
          and cognitive insights are
          ready for today.
        </p>

      </div>

    </div>
  );
}