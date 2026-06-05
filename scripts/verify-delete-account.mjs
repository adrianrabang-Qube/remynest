// Read-only post-deploy verification for GDPR Delete Account.
// Usage:  node scripts/verify-delete-account.mjs
// Checks what can be checked over the REST/Admin API; prints SQL for the rest.
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8").split("\n").filter(Boolean).map((l) => {
    const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
  }),
);
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const EMAIL = "deleted-contributor@system.remynest.internal";
let ok = true;
const line = (pass, msg) => { console.log(`${pass ? "PASS" : "FAIL"}  ${msg}`); if (!pass) ok = false; };

// 1. pending_account_deletions table exists (migration applied).
// Use a real (non-head) select: head+count does NOT error on a missing table
// in this PostgREST setup, which would be a false positive.
{
  const { error } = await db.from("pending_account_deletions").select("user_id").limit(1);
  line(!error, `pending_account_deletions table exists (migration applied)${error ? " — " + error.message : ""}`);
}

// 2. tombstone profiles row exists
let tombId = null;
{
  const { data } = await db.from("profiles").select("id").eq("email", EMAIL).maybeSingle();
  tombId = data?.id ?? null;
  line(!!tombId, `tombstone profiles row exists${tombId ? " (" + tombId + ")" : ""}`);
}

// 3. tombstone auth user exists
if (tombId) {
  const { data, error } = await db.auth.admin.getUserById(tombId);
  line(!error && !!data?.user, "tombstone auth.users row exists");
}

// 4. TOMBSTONE_USER_ID env set and matches
{
  const set = !!env.TOMBSTONE_USER_ID;
  line(set, `TOMBSTONE_USER_ID set in .env.local${set ? "" : " (also set in Vercel prod+preview)"}`);
  if (set && tombId) line(env.TOMBSTONE_USER_ID === tombId, "TOMBSTONE_USER_ID matches the tombstone id");
}

console.log("\nManual SQL check (function existence — cannot verify via REST):");
console.log("  select proname from pg_proc where proname='delete_user_account';");
console.log("  select has_function_privilege('anon','public.delete_user_account(uuid,jsonb)','execute'); -- expect false");
console.log(`\n${ok ? "All REST-checkable items PASS." : "Some checks FAILED — see above."}`);
process.exit(ok ? 0 : 1);
