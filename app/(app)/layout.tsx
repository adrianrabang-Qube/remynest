"use client"

import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }

  return (
    <div className="flex">
      {/* Sidebar */}
      <div className="w-64 h-screen bg-black text-white p-4 flex flex-col justify-between">
        <div>
          <h1 className="mb-6 text-xl">Remydr</h1>
          <div>Dashboard</div>
          <div>Memories</div>
          <div>New Memory</div>
          <div>Timeline</div>
          <div>Reminders</div>
        </div>

        {/* Logout button */}
        <button
          onClick={handleLogout}
          className="mt-6 bg-red-500 text-white p-2"
        >
          Logout
        </button>
      </div>

      {/* Main */}
      <div className="flex-1 p-6">{children}</div>
    </div>
  )
}