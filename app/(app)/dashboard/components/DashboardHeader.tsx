import RemyAvatar from "@/components/remy/avatar/RemyAvatar";
import type { RemyMood } from "@/components/remy/avatar/remy-moods";

type DashboardHeaderProps = {
  greeting: string;
  displayName: string;
  workspaceType?: "care" | "my-nest";
  workspaceLabel?: string;
  remyMood?: RemyMood;
};

export default function DashboardHeader({
  greeting,
  displayName,
  workspaceType = "care",
  workspaceLabel,
  remyMood = "welcoming",
}: DashboardHeaderProps) {
  return (
    <div className="space-y-4 max-md:space-y-3">

      <div className="flex flex-wrap items-center gap-3 max-md:gap-2">
        <div className="inline-flex items-center rounded-full bg-white/70 border border-sand-deep/70 px-4 py-1.5 text-xs font-medium uppercase tracking-wider text-charcoal-muted shadow-soft max-md:px-3 max-md:py-1 max-md:text-[11px]">
          Your Memory Home
        </div>

        <div className={`inline-flex items-center rounded-full px-4 py-1.5 text-xs font-medium uppercase tracking-wider shadow-soft border max-md:px-3 max-md:py-1 max-md:text-[11px] ${
          workspaceType === "my-nest"
            ? "bg-gold/10 border-gold/30 text-[#9c7e3f]"
            : "bg-sage/10 border-sage/25 text-sage"
        }`}>
          {workspaceType === "my-nest"
            ? "My Nest Workspace"
            : "Care Workspace"}
        </div>
      </div>

      <div className="flex items-start gap-4 max-md:items-center max-md:gap-3">

        {/* Remy — the AI Memory Companion, greeting from the header. Inline with
            the greeting + smaller on mobile (max-md:); unchanged at md+. */}
        <RemyAvatar
          mood={remyMood}
          size="lg"
          className="mt-1 shrink-0 max-md:mt-0 max-md:!h-11 max-md:!w-11"
        />

        <div className="min-w-0">

          <h1 className="text-4xl font-semibold tracking-tight text-charcoal mb-3 sm:text-5xl max-md:text-2xl max-md:mb-0.5">
            {greeting},{" "}
            {displayName}
          </h1>

          {/* Mobile: a single concise line. Desktop: the full welcome sentence. */}
          <p className="md:hidden text-sm text-charcoal-soft">
            {workspaceLabel ?? "Welcome back to RemyNest."}
          </p>
          <p className="hidden md:block text-lg text-charcoal-soft max-w-2xl leading-relaxed">
            {workspaceLabel ?? "Welcome back to RemyNest."}
            {" "}
            Your memories, reminders,
            and cognitive insights are
            ready for today.
          </p>

        </div>

      </div>

    </div>
  );
}