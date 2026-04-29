import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export default async function LoginPage() {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // 🚨 If already logged in → skip login
  if (user) {
    redirect("/memories")
  }

  return (
    <div className="flex items-center justify-center h-screen">
      <div className="p-6 border rounded w-80">
        <h1 className="text-xl mb-4">Login</h1>

        <form action="/api/login" method="post">
          <input
            name="email"
            type="email"
            placeholder="Enter your email"
            className="w-full p-2 border mb-4"
          />

          <input
            name="password"
            type="password"
            placeholder="Enter your password"
            className="w-full p-2 border mb-4"
          />

          <button className="w-full bg-black text-white p-2">
            Login
          </button>
        </form>
      </div>
    </div>
  )
}