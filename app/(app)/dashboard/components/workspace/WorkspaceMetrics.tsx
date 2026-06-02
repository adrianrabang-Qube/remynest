import DashboardStats from "../DashboardStats";

type Props = {
  memoryCount: number;
  currentPlan?: string | null;
  isPremium?: boolean;
  workspaceType?: "my-nest" | "care";
};

export function WorkspaceMetrics({
  workspaceType = "my-nest",
  ...props
}: Props) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border bg-white/70 px-4 py-3">
        <div className="text-xs uppercase tracking-wide text-neutral-500">
          Workspace Metrics
        </div>

        <div className="mt-2 flex items-center justify-between gap-4">
          <div>
            <h3 className="font-semibold text-neutral-900">
              {workspaceType === "care"
                ? "Care Workspace Insights"
                : "My Nest Insights"}
            </h3>

            <p className="text-sm text-neutral-600">
              Dashboard analytics preserved with workspace-aware context.
            </p>
          </div>
        </div>
      </div>

      <DashboardStats {...props} />
    </div>
  );
}