import LogoutButton from "@/components/LogoutButton";
import UpgradeButton from "@/components/UpgradeButton";
import CreateMemoryForm from "@/components/CreateMemoryForm";
import CreateProfileForm from "@/components/CreateProfileForm";
import InviteCaregiverForm from "@/components/InviteCaregiverForm";
import PendingInvites from "@/components/PendingInvites";

import { createClient } from "@/utils/supabase/server";
import { getAccessibleProfiles } from "@/lib/profile-access";

export default async function DashboardPage() {
  const supabase = await createClient();

  const accessibleProfiles =
    await getAccessibleProfiles();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: pendingInvites } =
    await supabase
      .from("caregiver_invites")
      .select(`
        *,
        memory_profiles (
          id,
          profile_name,
          preferred_name
        )
      `)
      .eq("email", user?.email)
      .eq("status", "pending");

  return (
    <div className="min-h-screen bg-[#f5f1ea]">
      <main className="max-w-6xl mx-auto px-6 py-10 space-y-8">
        {/* HERO */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-5xl font-bold mb-4">
              Welcome to RemyNest
            </h1>

            <p className="text-xl text-gray-600">
              Your AI-powered memory
              assistant.
            </p>
          </div>

          <LogoutButton />
        </div>

        {/* STATS */}
        <div className="grid md:grid-cols-2 gap-6">
          <div className="rounded-2xl border p-6 bg-white shadow-sm">
            <p className="text-gray-500 mb-2">
              Total Memories
            </p>

            <h2 className="text-5xl font-bold">
              {
                accessibleProfiles?.length
              }
            </h2>
          </div>

          <div className="rounded-2xl border p-6 bg-white shadow-sm">
            <p className="text-gray-500 mb-2">
              Subscription
            </p>

            <h2 className="text-3xl font-semibold">
              Free
            </h2>
          </div>
        </div>

        {/* PENDING INVITES */}
        <PendingInvites
          invites={
            pendingInvites || []
          }
        />

        {/* ACCESSIBLE PROFILES */}
        <div className="rounded-2xl border p-6 bg-white shadow-sm">
          <h2 className="text-2xl font-semibold mb-6">
            Accessible Profiles
          </h2>

          {!accessibleProfiles?.length && (
            <p className="text-gray-500">
              No accessible profiles yet.
            </p>
          )}

          <div className="space-y-6">
            {accessibleProfiles?.map(
              (profile: any) => (
                <div
                  key={profile.id}
                  className="border rounded-2xl p-6"
                >
                  <h3 className="text-3xl font-semibold mb-2">
                    {
                      profile.profile_name
                    }
                  </h3>

                  <p className="text-gray-600 mb-4">
                    Preferred Name:{" "}
                    {
                      profile.preferred_name
                    }
                  </p>

                  {profile.shared && (
                    <div className="space-y-2 mb-6">
                      <p className="text-gray-600">
                        Access Level:{" "}
                        {
                          profile.access_level
                        }
                      </p>

                      <p className="text-gray-600">
                        Relationship:{" "}
                        {
                          profile.relationship_type
                        }
                      </p>

                      <span className="inline-block rounded-full bg-blue-100 text-blue-700 px-3 py-1 text-sm">
                        Shared With You
                      </span>
                    </div>
                  )}

                  <InviteCaregiverForm
                    memoryProfileId={
                      profile.id
                    }
                  />
                </div>
              )
            )}
          </div>
        </div>

        {/* ACCOUNT STATUS */}
        <div className="rounded-2xl border p-6 bg-white shadow-sm">
          <h2 className="text-2xl font-semibold mb-4">
            Account Status
          </h2>

          <p className="text-gray-600 mb-4">
            You are currently on the
            free plan.
          </p>

          <UpgradeButton />
        </div>

        {/* CREATE PROFILE */}
        <div className="rounded-2xl border p-6 bg-white shadow-sm">
          <h2 className="text-2xl font-semibold mb-2">
            Create Care Profile
          </h2>

          <p className="text-gray-500 mb-4">
            Create a new memory care
            profile.
          </p>

          <CreateProfileForm />
        </div>

        {/* CREATE MEMORY */}
        <div className="rounded-2xl border p-6 bg-white shadow-sm">
          <h2 className="text-2xl font-semibold mb-2">
            Create Memory
          </h2>

          <p className="text-gray-500 mb-4">
            Save something important.
          </p>

          <CreateMemoryForm />
        </div>
      </main>
    </div>
  );
}