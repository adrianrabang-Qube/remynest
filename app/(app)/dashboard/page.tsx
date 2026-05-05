import { createClient } from "@/lib/supabase/server"

export default async function DashboardPage() {
  const supabase = createClient()

  // 🔐 Get current user (REQUIRED)
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // If not logged in → no data
  if (!user) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold text-gray-800">
          Dashboard
        </h1>
        <p className="text-gray-500">Not logged in</p>
      </div>
    )
  }

  // ✅ FIXED QUERY (filter + correct order)
  const { data: memories } = await supabase
    .from("memories")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  const total = memories?.length || 0
  const latest = memories?.[0]

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-gray-800">
        Dashboard
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Total */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <p className="text-gray-500 text-sm">Total Memories</p>
          <p className="text-3xl font-semibold text-gray-800">
            {total}
          </p>
        </div>

        {/* Latest */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <p className="text-gray-500 text-sm">Latest Memory</p>
          <p className="text-gray-800 mt-2">
            {latest?.title || "No memories yet"}
          </p>
        </div>
      </div>
    </div>
  )
}