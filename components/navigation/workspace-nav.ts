/**
 * Shared shape for navbar/banner workspace state, derived in `(app)/layout.tsx`
 * from the existing active-context cookie (see lib/active-profile.ts). No new
 * workspace system — this is presentation state only.
 */
export interface WorkspaceNavState {
  isMyNest: boolean;
  activeProfileName: string | null;
}
