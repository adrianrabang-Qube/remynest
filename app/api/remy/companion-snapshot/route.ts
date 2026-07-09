import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { getActiveContext } from "@/lib/active-profile";

/**
 * Read-only data source for the Companion Intelligence layer (RemyMoments). Returns cheap,
 * workspace-scoped COUNTS for the current user — total/today/this-week memories and today's
 * reminder split — which the pure Insights Engine reasons over on the client. Auth-gated and scoped
 * exactly like the app (My Nest = null-profile / user_id; care = active profile from the cookie).
 *
 * It is fetched ONCE when the app shell mounts (never polled, no background job); degraded reads
 * return zeros so the companion silently does nothing rather than erroring.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const context = await getActiveContext();
  const activeProfileId = context.type === "CARE" ? context.profileId : null;
  const isMyNest = !activeProfileId;

  const now = new Date();
  const startOfToday = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  const todayLo = startOfToday.toISOString();
  const todayHi = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000).toISOString();
  const weekLo = new Date(startOfToday.getTime() - 6 * 24 * 60 * 60 * 1000).toISOString();

  const head = { count: "exact" as const, head: true };

  try {
    // Each count carries inline workspace scoping (My Nest = null profile + user_id; care =
    // profile). `.eq`/`.is` return the same builder type, so the conditional reassignment is
    // type-safe without a generic helper (Supabase builder variance makes that painful).
    let qMemTotal = supabase.from("memories").select("id", head);
    let qMemToday = supabase.from("memories").select("id", head).gte("created_at", todayLo);
    let qMemWeek = supabase.from("memories").select("id", head).gte("created_at", weekLo);
    let qRemDue = supabase
      .from("reminders")
      .select("id", head)
      .gte("remind_at", todayLo)
      .lt("remind_at", todayHi)
      .eq("completed", false);
    let qRemDone = supabase
      .from("reminders")
      .select("id", head)
      .gte("remind_at", todayLo)
      .lt("remind_at", todayHi)
      .eq("completed", true);
    let qRemToday = supabase
      .from("reminders")
      .select("id", head)
      .gte("remind_at", todayLo)
      .lt("remind_at", todayHi);

    if (activeProfileId) {
      qMemTotal = qMemTotal.eq("memory_profile_id", activeProfileId);
      qMemToday = qMemToday.eq("memory_profile_id", activeProfileId);
      qMemWeek = qMemWeek.eq("memory_profile_id", activeProfileId);
      qRemDue = qRemDue.eq("memory_profile_id", activeProfileId);
      qRemDone = qRemDone.eq("memory_profile_id", activeProfileId);
      qRemToday = qRemToday.eq("memory_profile_id", activeProfileId);
    } else {
      qMemTotal = qMemTotal.is("memory_profile_id", null).eq("user_id", user.id);
      qMemToday = qMemToday.is("memory_profile_id", null).eq("user_id", user.id);
      qMemWeek = qMemWeek.is("memory_profile_id", null).eq("user_id", user.id);
      qRemDue = qRemDue.is("memory_profile_id", null).eq("user_id", user.id);
      qRemDone = qRemDone.is("memory_profile_id", null).eq("user_id", user.id);
      qRemToday = qRemToday.is("memory_profile_id", null).eq("user_id", user.id);
    }

    const [memTotal, memToday, memWeek, remDue, remDone, remToday] = await Promise.all([
      qMemTotal,
      qMemToday,
      qMemWeek,
      qRemDue,
      qRemDone,
      qRemToday,
    ]);

    return NextResponse.json(
      {
        isMyNest,
        memoryCount: memTotal.count ?? 0,
        memoriesToday: memToday.count ?? 0,
        memoriesThisWeek: memWeek.count ?? 0,
        remindersDueToday: remDue.count ?? 0,
        remindersCompletedToday: remDone.count ?? 0,
        todaysReminderTotal: remToday.count ?? 0,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    // Best-effort ambient data — never surface an error to the companion.
    return NextResponse.json(
      {
        isMyNest,
        memoryCount: 0,
        memoriesToday: 0,
        memoriesThisWeek: 0,
        remindersDueToday: 0,
        remindersCompletedToday: 0,
        todaysReminderTotal: 0,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  }
}
