import { createClient } from "@/lib/supabase/server";
import UpgradeButton from "@/components/UpgradeButton";
import CreateMemoryForm from "@/components/CreateMemoryForm";

export default async function DashboardPage() {
  const supabase = createClient();

  // 🔐 Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 🚫 Not logged in
  if (!user) {
    return (
      <div className="space-y-6 p-6">
        <h1 className="text-2xl font-semibold text-gray-800">
          Please log in
        </h1>
      </div>
    );
  }

  // 👤 Get profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_premium")
    .eq("id", user.id)
    .single();

  const isPremium = profile?.is_premium;

  // 📦 Get user memories count
  const { data: memories } = await supabase
    .from("memories")
    .select("*")
    .eq("user_id", user.id);

  const totalMemories = memories?.length || 0;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          Welcome to RemyNest
        </h1>

        <p className="text-gray-600 mt-2">
          Your AI-powered memory assistant.
        </p>
      </div>

      {/* Stats */}
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
            {isPremium ? "Premium" : "Free"}
          </h2>
        </div>
      </div>

      {/* Premium Card */}
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
              You have access to premium features.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-gray-600">
              You are currently on the free plan.
            </p>

            <UpgradeButton />
          </div>
        )}
      </div>

      {/* Create Memory */}
      <CreateMemoryForm />
    </div>
  );
}