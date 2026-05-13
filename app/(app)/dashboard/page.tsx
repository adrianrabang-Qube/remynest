import { createClient } from "@/utils/supabase/server";
import UpgradeButton from "@/components/UpgradeButton";
import CreateMemoryForm from "@/components/CreateMemoryForm";
import { getAccessibleProfiles } from "@/lib/profile-access";

export default async function DashboardPage() {
  const supabase = await createClient();

  // AUTH USER
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="space-y-6 p-6">
        <h1 className="text-2xl font-semibold">
          Please log in
        </h1>
      </div>
    );
  }

  // PROFILE
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_premium")
    .eq("id", user.id)
    .single();

  const isPremium = profile?.is_premium;

  // MEMORIES
  const { data: memories } = await supabase
    .from("memories")
    .select("*")
    .eq("user_id", user.id);

  const totalMemories =
    memories?.length || 0;

  // ACCESSIBLE PROFILES
  const accessibleProfiles =
    await getAccessibleProfiles();

  return (
    <div className="space-y-6 p-6">
      {/* HEADER */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          Welcome to RemyNest
        </h1>

        <p className="text-gray-600 mt-2">
          Your AI-powered memory assistant.
        </p>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-2xl border p-6 bg-white shadow-sm">
          <p className="text-sm text-gray-500">
            Total Memories
          </p>

          <h2 className="text-3xl font-bold text-gray-900 mt-2">
            {totalMemories}
          </h2>
        </div>

        <div className="rounded-2xl border p-6 bg-white shadow-sm">
          <p className="text-sm text-gray-500">
            Subscription
          </p>

          <h2 className="text-2xl font-semibold mt-2">
            {isPremium
              ? "Premium"
              : "Free"}
          </h2>
        </div>
      </div>

      {/* ACCESSIBLE PROFILES */}
      <div className="rounded-2xl border p-6 bg-white shadow-sm">
        <h2 className="text-2xl font-semibold mb-4">
          Accessible Profiles
        </h2>

        {accessibleProfiles.length === 0 ? (
          <p className="text-gray-500">
            No accessible profiles yet.
          </p>
        ) : (
          <div className="grid gap-4">
            {accessibleProfiles.map(
              (profile: any) => (
                <div
                  key={profile.id}
                  className="border rounded-xl p-4"
                >
                  <h3 className="text-lg font-semibold">
                    {profile.profile_name}
                  </h3>

                  <p className="text-gray-600">
                    Preferred Name:{" "}
                    {profile.preferred_name}
                  </p>

                  <p className="text-sm text-gray-500 mt-2">
                    Access Level:{" "}
                    {profile.access_level}
                  </p>

                  <p className="text-sm text-gray-500">
                    Relationship:{" "}
                    {
                      profile.relationship_type
                    }
                  </p>

                  {profile.shared && (
                    <span className="inline-block mt-3 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                      Shared With You
                    </span>
                  )}
                </div>
              )
            )}
          </div>
        )}
      </div>

      {/* ACCOUNT STATUS */}
      <div className="rounded-2xl border p-6 bg-white shadow-sm">
        <h2 className="text-xl font-semibold mb-2">
          Account Status
        </h2>

        {isPremium ? (
          <div className="space-y-2">
            <p className="text-green-600 font-medium">
              ✅ Premium Active
            </p>

            <p className="text-gray-600">
              You have access to premium
              features.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-gray-600">
              You are currently on the
              free plan.
            </p>

            <UpgradeButton />
          </div>
        )}
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
    </div>
  );
}