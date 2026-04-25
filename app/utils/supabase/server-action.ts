import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

export function createActionClient() {
  const cookieStore = cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set() {},     // 🚫 no cookie writes
        remove() {},  // 🚫 no cookie writes
      },
    }
  )
}