import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { getStorageUsage } from "@/lib/storage/usage";

/**
 * GET /api/storage/usage — current storage usage summary for the authenticated
 * user (used / limit / remaining / percent). Auth-gated (protect-by-default).
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const usage = await getStorageUsage(user.id);
  return NextResponse.json(usage);
}
