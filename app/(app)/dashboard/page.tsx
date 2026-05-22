import UpgradeButton from "@/components/UpgradeButton";
import CreateMemoryForm from "@/components/CreateMemoryForm";
import CreateProfileForm from "@/components/CreateProfileForm";
import InviteCaregiverForm from "@/components/InviteCaregiverForm";
import PendingInvites from "@/components/PendingInvites";
import ProfileSwitcher from "@/components/ProfileSwitcher";

import { createClient } from "@/utils/supabase/server";

import {
  getAccessibleProfiles,
} from "@/lib/profile-access";

import {
  getActiveProfile,
} from "@/lib/active-profile";

import { redirect } from "next/navigation";

import { unstable_noStore as noStore } from "next/cache";

import DashboardHeader from "./components/DashboardHeader";
import DashboardStats from "./components/DashboardStats";
import DashboardProfilePanel from "./components/DashboardProfilePanel";
import DashboardAccountStatus from "./components/DashboardAccountStatus";
import DashboardCreateProfile from "./components/DashboardCreateProfile";
import DashboardCreateMemory from "./components/DashboardCreateMemory";
import DashboardActiveProfileWarning from "./components/DashboardActiveProfileWarning";
import DashboardTelemetry from "./components/DashboardTelemetry";

export default async function DashboardPage() {

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

  const accessibleProfiles =
    await getAccessibleProfiles();

  const activeProfileId =
    await getActiveProfile();

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
      data: profileData,
    } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    profile = profileData;
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
    profile?.preferred_name ||
    profile?.first_name ||
    user?.email?.split("@")[0] ||
    "there";

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

  const switcherProfiles =
    accessibleProfiles?.map(
      (profile: any) => ({
        memory_profiles: {
          id: profile.id,
          profile_name:
            profile.profile_name,
        },
      })
    ) || [];

  // =====================================
  // ACTIVE PROFILE
  // =====================================

  const activeProfile =
    accessibleProfiles?.find(
      (profile: any) =>
        profile.id ===
        activeProfileId
    ) || null;

  // =====================================
  // MEMORY COUNT
  // =====================================

  let memoryCount = 0;

  let memoryCountError:
    | unknown
    | null = null;

  if (activeProfileId) {

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
        activeProfileId
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

  return (
    <div className="min-h-screen bg-[#f5f1ea]">

      <main className="max-w-6xl mx-auto px-6 py-10 space-y-8">

        <DashboardHeader
          greeting={greeting}
          displayName={displayName}
        />

        {/* PROFILE SWITCHER */}
        <ProfileSwitcher
          profiles={
            switcherProfiles
          }
          activeProfileId={
            activeProfileId
          }
        />

        {/* ACTIVE PROFILE WARNING */}
        {!activeProfile && (
          <DashboardActiveProfileWarning />
        )}

        {/* STATS */}
        <DashboardStats
          memoryCount={memoryCount}
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
        {activeProfile && (
          <DashboardProfilePanel
            activeProfile={activeProfile}
          />
        )}

        {/* ACCOUNT STATUS */}
        <DashboardAccountStatus />

        {/* CREATE PROFILE */}
        <DashboardCreateProfile />

        {/* CREATE MEMORY */}
        <DashboardCreateMemory />
      </main>
    </div>
  );
}