import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { checkStorageQuota } from "@/lib/storage/enforcement";

/**
 * POST /api/storage/check  { bytes: number } — projected-usage quota check for a
 * pending upload of `bytes`. Returns a structured { allowed, projectedBytes,
 * overageBytes, usage } result. Auth-gated. This is the enforcement primitive;
 * it is NOT yet wired into the (frozen) upload pipeline.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const raw = (body as { bytes?: unknown })?.bytes;
  const bytes = Number(raw);
  const check = await checkStorageQuota(
    user.id,
    Number.isFinite(bytes) ? bytes : 0
  );

  return NextResponse.json(check);
}
