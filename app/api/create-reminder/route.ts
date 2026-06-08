export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { userCanAccessProfile } from "@/lib/profile-ownership";

export async function POST(req: Request) {
  try {
    // Authenticate via the session — RLS-scoped client (no service-role bypass).
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();

    const {
      title,
      remind_at,
      recurring,
      frequency,
      memory_profile_id,
    } = body;

    // SECURITY: user_id is derived from the authenticated session — NEVER from
    // the request body. (Previously the body's user_id + a service-role client
    // allowed creating reminders in another user's account = IDOR / push injection.)

    if (!title || !remind_at) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Ownership: a care-profile target must be owned by, or shared with, the
    // user. A null memory_profile_id is a personal (My Nest) reminder for self.
    if (memory_profile_id) {
      const allowed = await userCanAccessProfile(
        user.id,
        memory_profile_id
      );
      if (!allowed) {
        return NextResponse.json(
          { error: "Forbidden" },
          { status: 403 }
        );
      }
    }

    const { data, error } = await supabase
      .from("reminders")
      .insert([
        {
          title,
          remind_at,
          recurring: recurring || false,
          frequency: frequency || null,
          completed: false,
          sent: false,
          memory_profile_id: memory_profile_id || null,
          user_id: user.id,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("[create-reminder] insert failed", error);
      return NextResponse.json(
        { error: "Failed to create reminder" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, reminder: data });
  } catch (err) {
    console.error("[create-reminder] invalid request", err);
    return NextResponse.json(
      { error: "Invalid request" },
      { status: 400 }
    );
  }
}
