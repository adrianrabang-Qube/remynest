import { redirect } from "next/navigation";

import AppNavbar from "@/components/navigation/AppNavbar";
import NavigationProgress from "@/components/navigation/NavigationProgress";
import OneSignalInit from "@/components/OneSignalInit";
import { WorkspaceBanner } from "@/components/navigation/WorkspaceBanner";
import { createClient } from "@/lib/supabase/server";
import { retryPendingDeletionForUser } from "@/lib/gdpr/retry-pending-deletion";
import { resolveAccountIdentity } from "@/lib/account-identity";
import { resolveActiveProfileId } from "@/lib/context-resolver";
import { getAccessibleProfiles } from "@/lib/profile-access";
import { getCurrentUser } from "@/lib/auth/current-user";

// The navbar renders per-user, subscription-sensitive identity here — never
// serve this segment (or its identity read) from cache.
export const dynamic = "force-dynamic";

interface AppLayoutProps {
  children: React.ReactNode;
}

export default async function AppLayout({
  children,
}: AppLayoutProps) {
  const supabase = await createClient();
  const user = await getCurrentUser();

  // Defense-in-depth auth gate. The (app) route GROUP is the authentication
  // boundary — every route under it requires a session. The middleware enforces
  // this at the edge (protect-by-default), but gating here means an (app) route
  // can never render unauthenticated even if the edge config is ever bypassed,
  // and route-group membership (not an allowlist) guarantees newly-added (app)
  // routes are always covered.
  if (!user) redirect("/login");

  // Failure recovery: if a prior deletion completed data/storage but not the
  // auth user, finish it now (next-login retry) and end the session.
  const wasPending = await retryPendingDeletionForUser(user.id);
  if (wasPending) {
    await supabase.auth.signOut();
    redirect("/login?deleted=1");
  }

  // Single source of truth for navbar identity (same resolver as /settings).
  const identity = await resolveAccountIdentity();

  // Workspace context (reuses the existing active-context cookie) for the global
  // indicator + banner.
  const activeProfileId = await resolveActiveProfileId();
  let activeProfileName: string | null = null;
  if (activeProfileId) {
    const { data } = await supabase
      .from("memory_profiles")
      .select("preferred_name, profile_name")
      .eq("id", activeProfileId)
      .maybeSingle();
    activeProfileName =
      data?.preferred_name || data?.profile_name || "Care profile";
  }
  const workspace = {
    isMyNest: !activeProfileId,
    activeProfileName,
  };

  // RLS-scoped accessible care profiles for the global Workspace Selector (top
  // bar, every screen). Reuses the same loader the dashboard uses; failures
  // degrade to an empty list (selector still offers "My Nest").
  type AccessibleProfile = {
    id: string;
    profile_name?: string | null;
    preferred_name?: string | null;
  };
  let workspaceProfiles: { id: string; name: string }[] = [];
  try {
    const accessible = (await getAccessibleProfiles()) as AccessibleProfile[];
    workspaceProfiles = (accessible ?? []).map((profile) => ({
      id: profile.id,
      name: profile.preferred_name || profile.profile_name || "Care profile",
    }));
  } catch {
    workspaceProfiles = [];
  }

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Immediate in-flight navigation feedback (perceived performance). */}
      <NavigationProgress />

      {/* Loads the OneSignal Web SDK + registers the device for push. Self-guards
          on an authenticated user; this segment is already auth-gated. */}
      <OneSignalInit />

      <AppNavbar
        profile={identity?.summary ?? null}
        workspace={workspace}
        workspaceProfiles={workspaceProfiles}
        activeProfileId={activeProfileId}
      />

      {!workspace.isMyNest && activeProfileName && (
        <WorkspaceBanner activeProfileName={activeProfileName} />
      )}

      {/* Mobile: tighter px-4 gutters + pb-24 to clear the fixed bottom nav.
          md+ restores the original px-6 / py-6. */}
      <main className="mx-auto w-full max-w-[1600px] px-4 pt-6 pb-24 md:px-6 md:pb-6">
        {children}
      </main>
    </div>
  );
}