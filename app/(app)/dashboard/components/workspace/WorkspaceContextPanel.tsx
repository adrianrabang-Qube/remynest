export type WorkspaceContextPanelProps = {
  activeProfile: any;
  workspaceType?: "my-nest" | "care";
};

export function WorkspaceContextPanel({
  activeProfile,
  workspaceType = "my-nest",
}: WorkspaceContextPanelProps) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border bg-white/70 px-4 py-3">
        <div className="text-xs uppercase tracking-wide text-neutral-500">
          Workspace Context
        </div>

        <div className="mt-2 flex items-center justify-between gap-4">
          <div>
            <h3 className="font-semibold text-neutral-900">
              {workspaceType === "care"
                ? "Care Workspace"
                : "My Nest Workspace"}
            </h3>

            <p className="text-sm text-neutral-600">
              Active profile aware dashboard context.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}