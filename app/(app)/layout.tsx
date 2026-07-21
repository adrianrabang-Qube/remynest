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
import {
  RemyProvider,
  RemyFloatingPresence,
  RemyScreenAwareness,
  RemyCelebration,
  RemyMilestones,
  RemyMoments,
  RemyRelationship,
} from "@/lib/remy";
import RemyConnectivityBridge from "@/components/RemyConnectivityBridge";

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

  type AccessibleProfile = {
    id: string;
    profile_name?: string | null;
    preferred_name?: string | null;
  };

  // Workspace context (reuses the existing active-context cookie). This cheap cookie
  // read gates the two workspace-scoped queries below, so resolve it first.
  const activeProfileId = await resolveActiveProfileId();

  // LA3 (perf): the four remaining reads are independent of each other, so run them
  // CONCURRENTLY instead of as a serial waterfall on every authenticated navigation.
  // Each keeps its original degrade-to-default, so the data + fallbacks are identical:
  //  - identity (navbar), accessible care profiles (selector; → [] on error),
  //  - the active care-profile name (only when a care profile is active),
  //  - the RLS-scoped memory head-count (Nest evolution stage; → 0 on error).
  const memoryCountQuery = activeProfileId
    ? supabase
        .from("memories")
        .select("id", { count: "exact", head: true })
        .eq("memory_profile_id", activeProfileId)
    : supabase
        .from("memories")
        .select("id", { count: "exact", head: true })
        .is("memory_profile_id", null)
        .eq("user_id", user.id);

  const [identity, accessible, nameRow, memoryCount] = await Promise.all([
    // Single source of truth for navbar identity (same resolver as /settings).
    resolveAccountIdentity(),
    // RLS-scoped accessible care profiles for the global Workspace Selector (→ [] on error).
    (getAccessibleProfiles() as Promise<AccessibleProfile[]>).catch(
      () => [] as AccessibleProfile[]
    ),
    // Active care-profile name (only when a care profile is active) → null on error.
    // Two-arg then handles rejection (the Supabase builder is a thenable, not a Promise).
    activeProfileId
      ? supabase
          .from("memory_profiles")
          .select("preferred_name, profile_name")
          .eq("id", activeProfileId)
          .maybeSingle()
          .then(
            (r) => r.data as { preferred_name?: string | null; profile_name?: string | null } | null,
            () => null
          )
      : Promise.resolve(
          null as { preferred_name?: string | null; profile_name?: string | null } | null
        ),
    // RLS-scoped memory head-count → 0 on error.
    memoryCountQuery.then((r) => r.count ?? 0, () => 0),
  ]);

  const activeProfileName: string | null = activeProfileId
    ? nameRow?.preferred_name || nameRow?.profile_name || "Care profile"
    : null;
  const workspace = {
    isMyNest: !activeProfileId,
    activeProfileName,
  };
  const workspaceProfiles: { id: string; name: string }[] = (accessible ?? []).map(
    (profile) => ({
      id: profile.id,
      name: profile.preferred_name || profile.profile_name || "Care profile",
    })
  );

  return (
    // Remy companion provider (foundation). Wraps the shell so the Floating layer + future
    // Nest button have context. `children` is a stable prop, so opening/closing Remy
    // re-renders ONLY the provider + its context consumers (the layer) — never the app tree.
    <RemyProvider>
      <div className="min-h-screen bg-sand">
        {/* LA2: skip-to-content (WCAG 2.4.1 Bypass Blocks) — the first focusable
            element; visible only on keyboard focus, jumps past the header/nav. */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-sage focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white focus:outline-none focus:ring-2 focus:ring-sage focus:ring-offset-2"
        >
          Skip to content
        </a>
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
          memoryCount={memoryCount}
        />

        {!workspace.isMyNest && activeProfileName && (
          <WorkspaceBanner activeProfileName={activeProfileName} />
        )}

        {/* Mobile: tighter px-4 gutters + safe-area-aware clearance for the
            fixed bottom nav. The extra breathing room keeps the final action on
            long flows (such as puzzle completion) reachable above the home
            indicator on every iPhone size. md+ restores the original layout. */}
        <main
          id="main-content"
          tabIndex={-1}
          className="mx-auto w-full max-w-[1600px] px-4 pt-6 pb-[calc(7.5rem+env(safe-area-inset-bottom))] md:px-6 lg:pb-6 focus:outline-none"
        >
          {children}
        </main>

        {/* Remy's home — portaled, above content, below modals, safe-area aware. */}
        <RemyFloatingPresence />

        {/* App-wide companion presence (all render nothing until Remy reacts): a centre-stage
            celebration on milestones, screen-arrival reactions, and real-count milestone detection. */}
        <RemyCelebration />
        <RemyScreenAwareness />
        <RemyMilestones memoryCount={memoryCount} />
        {/* Companion Intelligence — proactive behavioural moments (once per app-open, not polled). */}
        <RemyMoments />
        {/* Living Relationship System — long-term relationship moments (once per app-open; yields
            to the daily moment via the shared gate). */}
        <RemyRelationship />

        {/* Bridges browser online/offline into Remy semantic events (no UI). */}
        <RemyConnectivityBridge />
      </div>
    </RemyProvider>
  );
}
