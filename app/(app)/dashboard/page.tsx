import { createClient } from "@/lib/supabase/server"

export default async function DashboardPage() {
  const supabase = createClient()

  const { data: memories } = await supabase
    .from("memories")
    .select("*")

  const total = memories?.length || 0

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-gray-800">
        Dashboard
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <p className="text-gray-500 text-sm">Total Memories</p>
          <p className="text-3xl font-semibold text-gray-800">
            {total}
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <p className="text-gray-500 text-sm">Latest Memory</p>
          <p className="text-gray-800 mt-2">
            {memories?.[0]?.title || "No memories yet"}
          </p>
        </div>
      </div>
    </div>
  )
}