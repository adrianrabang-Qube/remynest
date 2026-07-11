import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const supabase =
  await createClient();

  await supabase.auth.signOut()

  // RC2: derive the origin from the request instead of a hardcoded http://localhost (which broke prod
  // logout + downgraded to plaintext HTTP).
  return NextResponse.redirect(new URL("/login", request.url))
}