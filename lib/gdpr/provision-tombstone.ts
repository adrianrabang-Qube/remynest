import { supabaseAdmin } from "@/utils/supabase/admin";
import {
  TOMBSTONE_DISPLAY_NAME,
  TOMBSTONE_EMAIL,
} from "@/lib/gdpr/tombstone";

/**
 * One-off tombstone provisioning (run once per environment).
 *
 * Creates the "Deleted Contributor" auth user via the Admin API (the supported
 * way — no raw auth.users DML) plus a matching `profiles` display row, then
 * returns its id. Set the returned id as the `TOMBSTONE_USER_ID` env var.
 *
 * Idempotent: if `TOMBSTONE_USER_ID` is already set, it ensures the profiles row
 * exists and returns that id without creating a second auth user.
 *
 * Usage (one-off, e.g. a script or admin action — NOT called per deletion):
 *   const id = await provisionTombstone();
 *   // then set TOMBSTONE_USER_ID=<id> in the environment
 */
export async function provisionTombstone(): Promise<string> {
  const existing = process.env.TOMBSTONE_USER_ID;

  if (existing) {
    await ensureProfileRow(existing);
    return existing;
  }

  // Idempotency: reuse an already-provisioned tombstone if one exists (prevents
  // creating a second auth user when run before TOMBSTONE_USER_ID is set).
  const { data: byEmail } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("email", TOMBSTONE_EMAIL)
    .maybeSingle();
  if (byEmail?.id) {
    await ensureProfileRow(byEmail.id);
    return byEmail.id;
  }

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email: TOMBSTONE_EMAIL,
    email_confirm: true,
    app_metadata: { system_account: true },
    user_metadata: { display_name: TOMBSTONE_DISPLAY_NAME },
  });

  if (error || !data?.user) {
    throw new Error(
      `Failed to provision tombstone auth user: ${error?.message ?? "unknown"}`,
    );
  }

  const id = data.user.id;
  await ensureProfileRow(id);

  console.warn(
    `[tombstone] provisioned auth user ${id} — set TOMBSTONE_USER_ID=${id} in the environment`,
  );
  return id;
}

async function ensureProfileRow(id: string): Promise<void> {
  await supabaseAdmin.from("profiles").upsert(
    {
      id,
      email: TOMBSTONE_EMAIL,
      first_name: "Deleted",
      preferred_name: TOMBSTONE_DISPLAY_NAME,
      profile_name: TOMBSTONE_DISPLAY_NAME,
    },
    { onConflict: "id" },
  );
}
