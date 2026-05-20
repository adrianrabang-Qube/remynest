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

export default async function DashboardPage() {

  const supabase =
    await createClient();

  const accessibleProfiles =
    await getAccessibleProfiles();

  const activeProfileId =
    await getActiveProfile();

  const {
    data: { user },
  } = await supabase.auth.getUser();

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

  if (activeProfileId) {

    const {
      count,
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
  }

  return (
    <div className="min-h-screen bg-[#f5f1ea]">

      <main className="max-w-6xl mx-auto px-6 py-10 space-y-8">

        {/* HERO */}
        <div className="space-y-4">

          <div className="inline-flex items-center rounded-full bg-white border px-4 py-2 text-sm text-gray-600 shadow-sm">
            AI Cognitive Memory Assistant
          </div>

          <div>

            <h1 className="text-5xl font-bold tracking-tight text-[#2f3e34] mb-4">
              {greeting},{" "}
              {displayName}
            </h1>

            <p className="text-xl text-gray-600 max-w-2xl leading-relaxed">
              Welcome back to RemyNest.
              Your memories, reminders,
              and cognitive insights are
              ready for today.
            </p>
          </div>
        </div>

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
          <div className="rounded-2xl border border-yellow-300 bg-yellow-50 p-5 shadow-sm">
            <p className="text-yellow-700 font-medium">
              No active care profile
              selected.
            </p>
          </div>
        )}

        {/* STATS */}
        <div className="grid md:grid-cols-2 gap-6">

          <div className="rounded-3xl border bg-white p-6 shadow-sm">

            <p className="text-gray-500 mb-3">
              Total Memories
            </p>

            <h2 className="text-5xl font-bold text-[#2f3e34]">
              {memoryCount}
            </h2>

            <p className="text-sm text-gray-400 mt-3">
              Your cognitive archive
              continues to grow.
            </p>
          </div>

          <div className="rounded-3xl border bg-white p-6 shadow-sm">

            <p className="text-gray-500 mb-3">
              Subscription
            </p>

            <h2 className="text-3xl font-semibold text-[#2f3e34]">
              Free Plan
            </h2>

            <p className="text-sm text-gray-400 mt-3">
              Upgrade anytime for
              advanced AI cognition
              features.
            </p>
          </div>
        </div>

        {/* PENDING INVITES */}
        <PendingInvites
          invites={
            pendingInvites || []
          }
        />

        {/* ACTIVE PROFILE DETAILS */}
        {activeProfile && (

          <div className="rounded-3xl border bg-white p-6 shadow-sm">

            <h2 className="text-2xl font-semibold mb-6 text-[#2f3e34]">
              Active Profile
            </h2>

            <div className="border rounded-3xl p-6 bg-[#faf8f4]">

              <h3 className="text-3xl font-semibold mb-3 text-[#2f3e34]">
                {
                  activeProfile.profile_name
                }
              </h3>

              <p className="text-gray-600 mb-5">
                Preferred Name:{" "}
                {
                  activeProfile.preferred_name
                }
              </p>

              {activeProfile.shared && (

                <div className="space-y-2 mb-6">

                  <p className="text-gray-600">
                    Access Level:{" "}
                    {
                      activeProfile.access_level
                    }
                  </p>

                  <p className="text-gray-600">
                    Relationship:{" "}
                    {
                      activeProfile.relationship_type
                    }
                  </p>

                  <span className="inline-block rounded-full bg-blue-100 text-blue-700 px-4 py-2 text-sm font-medium">
                    Shared With You
                  </span>
                </div>
              )}

              <InviteCaregiverForm
                memoryProfileId={
                  activeProfile.id
                }
              />
            </div>
          </div>
        )}

        {/* ACCOUNT STATUS */}
        <div className="rounded-3xl border bg-white p-6 shadow-sm">

          <h2 className="text-2xl font-semibold mb-4 text-[#2f3e34]">
            Account Status
          </h2>

          <p className="text-gray-600 mb-5">
            You are currently using
            the free RemyNest plan.
          </p>

          <UpgradeButton />
        </div>

        {/* CREATE PROFILE */}
        <div className="rounded-3xl border bg-white p-6 shadow-sm">

          <h2 className="text-2xl font-semibold mb-2 text-[#2f3e34]">
            Create Care Profile
          </h2>

          <p className="text-gray-500 mb-5">
            Create a new memory care
            profile for yourself or a
            loved one.
          </p>

          <CreateProfileForm />
        </div>

        {/* CREATE MEMORY */}
        <div className="rounded-3xl border bg-white p-6 shadow-sm">

          <h2 className="text-2xl font-semibold mb-2 text-[#2f3e34]">
            Create Memory
          </h2>

          <p className="text-gray-500 mb-5">
            Save an important moment,
            thought, or experience.
          </p>

          <CreateMemoryForm />
        </div>
      </main>
    </div>
  );
}