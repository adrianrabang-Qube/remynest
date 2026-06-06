import type { WorkspaceNavState } from "./workspace-nav";

/**
 * Persistent, color-coded badge showing the current workspace on every page.
 * Stone = My Nest (personal); amber = a Care workspace (with the profile name).
 * Presentational only.
 */
export default function WorkspaceIndicator({
  isMyNest,
  activeProfileName,
}: WorkspaceNavState) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ring-1 ${
        isMyNest
          ? "bg-stone-100 text-stone-700 ring-stone-200"
          : "bg-amber-100 text-amber-800 ring-amber-300"
      }`}
      aria-label={
        isMyNest
          ? "Current workspace: My Nest"
          : `Current workspace: Care, ${activeProfileName ?? "profile"}`
      }
    >
      <span
        className={`h-2 w-2 rounded-full ${
          isMyNest ? "bg-stone-400" : "bg-amber-500"
        }`}
      />
      {isMyNest ? "My Nest" : `Care · ${activeProfileName ?? "Profile"}`}
    </span>
  );
}
