import PendingInvites from "@/components/PendingInvites";
import ProfileSwitcher from "@/components/ProfileSwitcher";

import { createClient } from "@/utils/supabase/server";

import {
  getAccessibleProfiles,
} from "@/lib/profile-access";

import {
  getActiveContext,
} from "@/lib/active-profile";

import { redirect } from "next/navigation";

import { unstable_noStore as noStore } from "next/cache";

import {
  formatDisplayName,
} from "./lib/dashboard-formatters";

import {
  logDashboardLoad,
} from "./lib/dashboard-telemetry";

import DashboardHeader from "./components/DashboardHeader";
import DashboardStats from "./components/DashboardStats";
import DashboardProfilePanel from "./components/DashboardProfilePanel";
import DashboardAccountStatus from "./components/DashboardAccountStatus";
import DashboardCreateProfile from "./components/DashboardCreateProfile";
import DashboardCreateMemory from "./components/DashboardCreateMemory";
import DashboardActiveProfileWarning from "./components/DashboardActiveProfileWarning";
import DashboardTelemetry from "./components/DashboardTelemetry";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: {
    context?: string;
  };
}) {

  // =====================================
  // REALTIME / DYNAMIC GOVERNANCE
  // =====================================

  noStore();

  const dashboardRequestId =
    crypto.randomUUID();

  const dashboardStart =
    performance.now();

  function logDashboardStage(
    stage: string,
    metadata?: unknown
  ) {
    console.info(
      `[dashboard-page] ${stage}`,
      metadata || {}
    );
  }

  function logDashboardError(
    stage: string,
    error: unknown
  ) {
    console.error(
      `[dashboard-page] ${stage}`,
      error
    );
  }

  logDashboardStage(
    "dashboard-request-started",
    {
      dashboardRequestId,
    }
  );

  const supabase =
    await createClient();

  console.error(
    "[DASHBOARD_RUNTIME_MARKER] page.tsx EXECUTING",
    {
      file: "app/(app)/dashboard/page.tsx",
      dashboardRequestId,
    }
  );

  let accessibleProfiles: any[] = [];

  try {
    console.error(
      "[DASHBOARD_RUNTIME_MARKER] BEFORE getAccessibleProfiles"
    );

    accessibleProfiles =
      await getAccessibleProfiles();

    console.error(
      "[DASHBOARD_RUNTIME_MARKER] AFTER getAccessibleProfiles",
      {
        count:
          accessibleProfiles?.length || 0,
        profiles:
          accessibleProfiles,
      }
    );
  } catch (error) {
    console.error(
      "[DASHBOARD_RUNTIME_MARKER] getAccessibleProfiles FAILED",
      error
    );

    accessibleProfiles = [];
  }

  console.error(
    "[DASHBOARD_RUNTIME_MARKER] accessibleProfiles-final",
    {
      count:
        accessibleProfiles?.length || 0,
      profiles:
        accessibleProfiles,
    }
  );

  const activeContext =
    await getActiveContext();

  const resolvedActiveProfileId =
    activeContext?.type === "CARE"
      ? activeContext.profileId
      : null;

  const fallbackActiveProfileId =
    !resolvedActiveProfileId &&
    accessibleProfiles?.length > 0
      ? accessibleProfiles[0]?.id
      : null;

  const activeProfileId =
    resolvedActiveProfileId ||
    fallbackActiveProfileId;

  const isMyNestContext =
    searchParams?.context ===
    "my-nest";

  const effectiveActiveProfileId =
    isMyNestContext
      ? null
      : activeProfileId;

  console.info(
    "[ACTIVE_PROFILE_RESOLUTION]",
    {
      activeContext,
      resolvedActiveProfileId,
      fallbackActiveProfileId,
      finalActiveProfileId:
        activeProfileId,
      accessibleProfilesCount:
        accessibleProfiles?.length || 0,
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  logDashboardStage(
    "dashboard-auth-loaded",
    {
      dashboardRequestId,

      authenticated:
        Boolean(user),
    }
  );

  // =====================================
  // AUTH PROTECTION
  // =====================================

  if (!user) {
    redirect("/login");
  }

  // =====================================
  // FETCH USER PROFILE
  // =====================================

  let profile: any = null;

  if (user?.id) {

    const {
      data: profileById,
    } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    const {
      data: profileByEmail,
    } = user.email
      ? await supabase
          .from("profiles")
          .select("*")
          .eq("email", user.email)
          .maybeSingle()
      : { data: null };

    const candidates = [
      profileById,
      profileByEmail,
    ].filter(Boolean);

    const premiumProfile =
      candidates.find(
        (candidate: any) =>
          candidate?.is_premium === true ||
          candidate?.subscription_status === "active" ||
          candidate?.subscription_plan
            ?.toUpperCase() === "PREMIUM" ||
          candidate?.subscription_plan
            ?.toUpperCase() === "FAMILY"
      ) || null;

    profile =
      premiumProfile ||
      profileById ||
      profileByEmail ||
      null;

    console.info(
      "[BILLING_DEBUG]",
      {
        userId: user.id,
        userEmail: user.email,
        profileById,
        profileByEmail,
        premiumProfile,
        resolvedProfile: profile,
      }
    );
  }

  // =====================================
  // ONBOARDING PROTECTION
  // =====================================

  if (
    !profile?.onboarding_completed
  ) {
    redirect("/onboarding");
  }

  // =====================================
  // GREETING ENGINE
  // =====================================

  const hour =
    new Date().getHours();

  let greeting = "";

  if (hour < 12) {

    greeting =
      "Good morning";

  } else if (hour < 18) {

    greeting =
      "Good afternoon";

  } else {

    greeting =
      "Good evening";
  }

  const displayName =
    formatDisplayName(
      profile?.preferred_name ||
      profile?.first_name ||
      user?.email?.split("@")[0] ||
      "there"
    );

  // =====================================
  // PENDING INVITES
  // =====================================

  const {
    data: pendingInvites,
    error: pendingInvitesError,
  } = await supabase
    .from("caregiver_invites")
    .select(`
      *,
      memory_profiles (
        id,
        profile_name,
        preferred_name
      )
    `)
    .eq(
      "email",
      user?.email
    )
    .eq(
      "status",
      "pending"
    );

  if (pendingInvitesError) {

    logDashboardError(
      "pending-invites-error",
      {
        dashboardRequestId,

        pendingInvitesError,
      }
    );
  }

  // =====================================
  // PROFILE SWITCHER DATA
  // =====================================

  const switcherProfiles = Array.from(
    new Map(
      (accessibleProfiles || []).map(
        (profile: any) => [
          profile.id,
          {
            id: profile.id,
            profile_name:
              profile.profile_name,
            preferred_name:
              profile.preferred_name,
            shared:
              Boolean(profile.shared),
            access_level:
              profile.access_level ||
              "owner",
          },
        ]
      )
    ).values()
  );

  console.error(
    "[PROFILE_SWITCHER_PAYLOAD]",
    switcherProfiles
  );

  console.error(
    "[PROFILE_SWITCHER_DEDUPED_COUNT]",
    {
      rawCount:
        accessibleProfiles?.length || 0,
      dedupedCount:
        switcherProfiles.length,
    }
  );

  // =====================================
  // ACTIVE PROFILE
  // =====================================

  const activeProfile =
    accessibleProfiles?.find(
      (profile: any) =>
        profile.id ===
        activeProfileId
    ) || null;

  console.info(
    "[ACTIVE_PROFILE_OBJECT]",
    {
      activeProfileId,
      activeProfile,
      availableProfiles:
        accessibleProfiles,
    }
  );

  // =====================================
  // MEMORY COUNT
  // =====================================

  let memoryCount = 0;

  let memoryCountError:
    | unknown
    | null = null;

  if (effectiveActiveProfileId) {

    const {
      count,
      error,
    } = await supabase
      .from("memories")
      .select("*", {
        count: "exact",
        head: true,
      })
      .eq(
        "memory_profile_id",
        effectiveActiveProfileId
      );

    memoryCount =
      count || 0;

    memoryCountError =
      error;
  }

  if (memoryCountError) {

    logDashboardError(
      "memory-count-error",
      {
        dashboardRequestId,

        memoryCountError,
      }
    );
  }

  const dashboardDurationMs =
    Number(
      (
        performance.now() -
        dashboardStart
      ).toFixed(2)
    );

  logDashboardStage(
    "dashboard-request-completed",
    {
      dashboardRequestId,

      activeProfileId,

      accessibleProfiles:
        accessibleProfiles?.length || 0,

      memoryCount,

      durationMs:
        dashboardDurationMs,
    }
  );

  logDashboardLoad({
    requestId:
      dashboardRequestId,

    userId: user.id,

    profileId:
      activeProfileId ||
      undefined,

    metadata: {
      memoryCount,
      durationMs:
        dashboardDurationMs,
    },
  });

  console.info(
    "[dashboard-page] billing-state",
    {
      userId: user.id,
      userEmail: user.email,
      subscription_plan:
        profile?.subscription_plan,
      is_premium:
        profile?.is_premium,
      subscription_status:
        profile?.subscription_status,
      resolvedCurrentPlan:
        profile?.is_premium ||
        profile?.subscription_status === "active" ||
        profile?.subscription_plan
          ?.toUpperCase() === "PREMIUM" ||
        profile?.subscription_plan
          ?.toUpperCase() === "FAMILY"
          ? "PREMIUM"
          : profile?.subscription_plan || "FREE",
    }
  );

  return (
    <div className="min-h-screen bg-[#f5f1ea]">

      <main className="max-w-6xl mx-auto px-6 py-10 space-y-8">

        <DashboardHeader
          greeting={greeting}
          displayName={displayName}
        />

        {/* PROFILE SWITCHER */}
        {!isMyNestContext && (
          <ProfileSwitcher
            profiles={
              switcherProfiles
            }
            activeProfileId={
              activeProfileId
            }
          />
        )}

        {/* ACTIVE PROFILE WARNING */}
        {!isMyNestContext &&
          !activeProfile && (
            <DashboardActiveProfileWarning />
        )}

        {/* STATS */}
        <DashboardStats
          memoryCount={memoryCount}
          currentPlan={
            profile?.is_premium ||
            profile?.subscription_status === "active" ||
            profile?.subscription_plan
              ?.toUpperCase() === "PREMIUM" ||
            profile?.subscription_plan
              ?.toUpperCase() === "FAMILY"
              ? "PREMIUM"
              : profile?.subscription_plan || "FREE"
          }
          isPremium={Boolean(
            profile?.is_premium ||
            profile?.subscription_status === "active" ||
            profile?.subscription_plan?.toUpperCase() === "FAMILY"
          )}
        />

        {/* PENDING INVITES */}
        <PendingInvites
          invites={
            pendingInvites || []
          }
        />

        <DashboardTelemetry
          memoryCount={memoryCount}
          activeProfileName={
            activeProfile?.profile_name
          }
        />

        {/* ACTIVE PROFILE DETAILS */}
        {!isMyNestContext &&
          activeProfile && (
            <DashboardProfilePanel
              activeProfile={activeProfile}
            />
        )}

        {/* ACCOUNT STATUS */}
        <DashboardAccountStatus
          currentPlan={
            profile?.is_premium ||
            profile?.subscription_status === "active" ||
            profile?.subscription_plan
              ?.toUpperCase() === "PREMIUM" ||
            profile?.subscription_plan
              ?.toUpperCase() === "FAMILY"
              ? "PREMIUM"
              : profile?.subscription_plan || "FREE"
          }
          isPremium={Boolean(
            profile?.is_premium ||
            profile?.subscription_status === "active" ||
            profile?.subscription_plan?.toUpperCase() === "FAMILY"
          )}
        />

        {/* CREATE PROFILE */}
        <DashboardCreateProfile />

        {/* CREATE MEMORY */}
        <DashboardCreateMemory />
      </main>
    </div>
  );
}