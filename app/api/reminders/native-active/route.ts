import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/reminders/native-active
 *
 * The native iOS app posts the reminder ids for which it currently holds a PENDING
 * on-device local notification. We record a per-reminder confirmation (scoped to the
 * caller's user_id) so the reminder cron can skip the redundant OneSignal push for
 * those reminders (the iOS duplicate-notification fix) while still doing its lifecycle
 * bookkeeping.
 *
 * Auth-gated (protect-by-default middleware). Writes go through the SESSION client, so
 * RLS confines each row to the caller's own user_id — a user can never confirm (and
 * thereby suppress the push of) another account's reminder. Best-effort: if the
 * confirmations table is not migrated yet, this no-ops (the whole feature is inert).
 */

const MAX_IDS = 200;
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const ids = (body as { reminderIds?: unknown } | null)?.reminderIds;
  if (!Array.isArray(ids)) {
    return NextResponse.json(
      { error: "reminderIds must be an array" },
      { status: 400 }
    );
  }

  const clean = [
    ...new Set(
      ids.filter(
        (x): x is string => typeof x === "string" && UUID_RE.test(x)
      )
    ),
  ].slice(0, MAX_IDS);

  if (clean.length === 0) {
    return NextResponse.json({ ok: true, confirmed: 0 });
  }

  const nowIso = new Date().toISOString();
  const rows = clean.map((reminder_id) => ({
    reminder_id,
    user_id: user.id,
    confirmed_at: nowIso,
  }));

  const { error } = await supabase
    .from("reminder_local_confirmations")
    .upsert(rows, { onConflict: "reminder_id,user_id" });

  if (error) {
    // Pre-migration (table absent) or an RLS rejection on a foreign row — treat as inert,
    // never a hard error (the cron simply falls back to sending the push).
    return NextResponse.json({ ok: true, confirmed: 0, skipped: true });
  }

  return NextResponse.json({ ok: true, confirmed: clean.length });
}
