import { redirect } from "next/navigation";

import AppNavbar from "@/components/navigation/AppNavbar";
import OneSignalInit from "@/components/OneSignalInit";
import { WorkspaceBanner } from "@/components/navigation/WorkspaceBanner";
import { createClient } from "@/lib/supabase/server";
import { retryPendingDeletionForUser } from "@/lib/gdpr/retry-pending-deletion";
import { resolveAccountIdentity } from "@/lib/account-identity";
import { resolveActiveProfileId } from "@/lib/context-resolver";

// The navbar renders per-user, subscription-sensitive identity here — never
// serve this segment (or its identity read) from cache.
export const dynamic = "force-dynamic";

interface AppLayoutProps {
  children: React.ReactNode;
}

export default async function AppLayout({
  children,
}: AppLayoutProps) {
  // Failure recovery: if a prior deletion completed data/storage but not the
  // auth user, finish it now (next-login retry) and end the session.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    const wasPending = await retryPendingDeletionForUser(user.id);
    if (wasPending) {
      await supabase.auth.signOut();
      redirect("/login?deleted=1");
    }
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

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Loads the OneSignal Web SDK + registers the device for push. Self-guards
          on an authenticated user; this segment is already auth-gated. */}
      <OneSignalInit />

      <AppNavbar
        profile={identity?.summary ?? null}
        workspace={workspace}
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