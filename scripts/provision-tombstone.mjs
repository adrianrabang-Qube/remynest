// One-off tombstone provisioning for GDPR Delete Account.
// Usage:  node scripts/provision-tombstone.mjs
// Creates the "Deleted Contributor" auth user (Admin API) + profiles display
// row, idempotently, and prints the id to set as TOMBSTONE_USER_ID.
//
// Requires .env.local with NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.
// Run this against the SAME project the app talks to (test first, then prod).
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split("\n")
    .filter(Boolean)
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);

const URL = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const EMAIL = "deleted-contributor@system.remynest.internal";
const NAME = "Deleted Contributor";
const db = createClient(URL, KEY);

async function ensureProfileRow(id) {
  const { error } = await db.from("profiles").upsert(
    { id, email: EMAIL, first_name: "Deleted", preferred_name: NAME, profile_name: NAME },
    { onConflict: "id" },
  );
  if (error) {
    console.error("profiles upsert failed (check NOT-NULL columns):", error.message);
    process.exit(1);
  }
}

// Reuse existing tombstone if already provisioned.
const preset = env.TOMBSTONE_USER_ID;
if (preset) {
  await ensureProfileRow(preset);
  console.log("TOMBSTONE_USER_ID=" + preset + "  (already set in .env.local)");
  process.exit(0);
}

const { data: byEmail } = await db.from("profiles").select("id").eq("email", EMAIL).maybeSingle();
if (byEmail?.id) {
  await ensureProfileRow(byEmail.id);
  console.log("TOMBSTONE_USER_ID=" + byEmail.id + "  (reused existing tombstone)");
  process.exit(0);
}

const { data, error } = await db.auth.admin.createUser({
  email: EMAIL,
  email_confirm: true,
  app_metadata: { system_account: true },
  user_metadata: { display_name: NAME },
});
if (error || !data?.user) {
  console.error("createUser failed:", error?.message ?? "unknown");
  process.exit(1);
}
await ensureProfileRow(data.user.id);
console.log("TOMBSTONE_USER_ID=" + data.user.id + "  (newly provisioned)");
console.log("-> set this in .env.local and Vercel (production + preview).");
