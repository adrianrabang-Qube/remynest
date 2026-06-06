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
        <div className="inline-flex items-center rounded-full bg-white/70 border border-sand-deep/70 px-4 py-1.5 text-xs font-medium uppercase tracking-wider text-charcoal-muted shadow-soft">
          Your Memory Home
        </div>

        <div className={`inline-flex items-center rounded-full px-4 py-1.5 text-xs font-medium uppercase tracking-wider shadow-soft border ${
          workspaceType === "my-nest"
            ? "bg-gold/10 border-gold/30 text-[#9c7e3f]"
            : "bg-sage/10 border-sage/25 text-sage"
        }`}>
          {workspaceType === "my-nest"
            ? "My Nest Workspace"
            : "Care Workspace"}
        </div>
      </div>

      <div>

        <h1 className="text-5xl font-semibold tracking-tight text-charcoal mb-3">
          {greeting},{" "}
          {displayName}
        </h1>

        <p className="text-lg text-charcoal-soft max-w-2xl leading-relaxed">
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