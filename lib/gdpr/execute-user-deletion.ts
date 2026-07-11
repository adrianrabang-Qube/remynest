import { supabaseAdmin } from "@/utils/supabase/admin";
import {
  MEDIA_BUCKET,
  userStoragePrefix,
  getTombstoneUserId,
} from "@/lib/gdpr/tombstone";

/**
 * GDPR account-deletion executor (service-role; idempotent; resumable).
 *
 * Order of operations:
 *   1. (retain mode) snapshot media paths of cross-contributed memories so they
 *      survive storage cleanup.
 *   2. delete_user_account RPC — transactional: ownership transfer, tombstoning,
 *      ordered DB deletion (steps 1–8).
 *   3. storage cleanup — recursively remove `memory-media/users/{userId}/`,
 *      EXCEPT files belonging to retained (tombstoned) memories.
 *   4. auth user deletion — LAST. On failure the account is marked
 *      pending_account_deletions and retried on next login.
 *
 * Safe to re-run: every stage is a no-op once already applied.
 *
 * KNOWN PROCESSOR-SIDE ERASURE GAPS (RC3 — tracked follow-ups, Art 17):
 *   - Stripe: the active subscription is NOT cancelled and the Stripe customer
 *     is NOT deleted here (billing PII persists at Stripe; a live sub keeps
 *     charging). Needs a Stripe call in the executor (separate billing phase).
 *   - OneSignal: the local device_registrations rows are removed (via the RPC),
 *     but the player/device is NOT deleted at OneSignal (push id persists there).
 *   - reminder_local_confirmations rows are not yet enrolled in the RPC (no FK
 *     cascade) — enroll them when the deletion RPC is next revised.
 *   Do NOT mark deletion "fully complete at the processor" until these ship.
 */

export interface ExecuteDeletionParams {
  userId: string;
  userEmail: string | null;
  /** false (default) = retain & anonymise contributed memories; true = hard delete them. */
  deleteContributed: boolean;
}

export interface ExecuteDeletionResult {
  status: "completed" | "auth_pending";
  rpc?: unknown;
  removedFiles: number;
  keptFiles: number;
  authError?: string;
}

type AttachmentLike = { url?: string; storagePath?: string };

/**
 * Resolve the in-bucket path from a stored media value, which may be a bare
 * storage path (current format), a legacy public URL, or a signed URL. Returns
 * null for foreign (non-storage) absolute URLs.
 */
function mediaPath(value: string | null | undefined): string | null {
  if (!value || typeof value !== "string") return null;
  const v = value.trim();
  if (!v) return null;
  for (const marker of [
    `/object/public/${MEDIA_BUCKET}/`,
    `/object/sign/${MEDIA_BUCKET}/`,
  ]) {
    const i = v.indexOf(marker);
    if (i !== -1) {
      return decodeURIComponent(v.slice(i + marker.length).split("?")[0]);
    }
  }
  if (/^https?:\/\//i.test(v)) return null; // foreign URL
  return v.replace(/^\/+/, ""); // already a bare path
}

/** Media paths (within the bucket) of cross-contributed memories to retain. */
async function snapshotRetainedMediaPaths(
  userId: string,
): Promise<Set<string>> {
  const keep = new Set<string>();

  // memories authored by the user that live in profiles owned by someone else
  const { data: ownedProfiles } = await supabaseAdmin
    .from("memory_profiles")
    .select("id")
    .eq("created_by_account_id", userId);
  const ownedIds = new Set((ownedProfiles ?? []).map((p) => p.id));

  const { data: memories } = await supabaseAdmin
    .from("memories")
    .select("memory_profile_id, cover_image_url, attachments")
    .eq("user_id", userId);

  for (const m of memories ?? []) {
    const pid = (m as { memory_profile_id?: string }).memory_profile_id;
    if (!pid || ownedIds.has(pid)) continue; // only cross-contributed
    const coverPath = mediaPath(
      (m as { cover_image_url?: string }).cover_image_url,
    );
    if (coverPath) keep.add(coverPath);

    const atts = (m as { attachments?: unknown }).attachments;
    if (Array.isArray(atts)) {
      for (const a of atts as AttachmentLike[]) {
        const p = mediaPath(a?.storagePath ?? a?.url);
        if (p) keep.add(p);
      }
    }
  }
  return keep;
}

/** Recursively list every object path under a prefix. */
async function listAllPaths(prefix: string): Promise<string[]> {
  const out: string[] = [];
  const stack = [prefix];
  while (stack.length) {
    const dir = stack.pop()!;
    const { data, error } = await supabaseAdmin.storage
      .from(MEDIA_BUCKET)
      .list(dir, { limit: 1000 });
    if (error || !data) continue;
    for (const entry of data) {
      const full = `${dir}/${entry.name}`;
      // Folders come back with a null id in Supabase storage listings.
      if ((entry as { id: string | null }).id === null) {
        stack.push(full);
      } else {
        out.push(full);
      }
    }
  }
  return out;
}

async function cleanupStorage(
  userId: string,
  keep: Set<string>,
): Promise<{ removed: number; kept: number }> {
  const prefix = userStoragePrefix(userId);
  const all = await listAllPaths(prefix);
  const toRemove = all.filter((p) => !keep.has(p));

  let removed = 0;
  for (let i = 0; i < toRemove.length; i += 100) {
    const batch = toRemove.slice(i, i + 100);
    const { error } = await supabaseAdmin.storage
      .from(MEDIA_BUCKET)
      .remove(batch);
    if (!error) removed += batch.length;
  }
  return { removed, kept: all.length - toRemove.length };
}

async function markPending(
  userId: string,
  email: string | null,
  fields: Record<string, unknown>,
) {
  await supabaseAdmin
    .from("pending_account_deletions")
    .upsert(
      {
        user_id: userId,
        email,
        updated_at: new Date().toISOString(),
        ...fields,
      },
      { onConflict: "user_id" },
    );
}

export async function executeUserDeletion(
  params: ExecuteDeletionParams,
): Promise<ExecuteDeletionResult> {
  const { userId, userEmail, deleteContributed } = params;

  // Resolve the tombstone id up front (retain mode) so a missing TOMBSTONE_USER_ID
  // fails BEFORE any destructive step. memories.user_id -> auth.users(id), so the
  // tombstone must be a real auth user (provisioned via provisionTombstone()).
  const tombstoneId = deleteContributed ? null : getTombstoneUserId();

  // 1. Snapshot retained media paths BEFORE the DB mutation (retain mode only).
  const keep = deleteContributed
    ? new Set<string>()
    : await snapshotRetainedMediaPaths(userId);

  // 2. Transactional DB deletion (transfer + tombstone + ordered deletes).
  const { data: rpcResult, error: rpcError } = await supabaseAdmin.rpc(
    "delete_user_account",
    { p_user_id: userId, p_options: { deleteContributed, tombstoneId } },
  );
  if (rpcError) {
    console.error("[delete-account] RPC failed", { userId, rpcError });
    throw new Error("Account data deletion failed");
  }
  await markPending(userId, userEmail, {
    data_deleted_at: new Date().toISOString(),
    status: "storage_pending",
  });

  // 3. Storage cleanup (retain-aware).
  const { removed, kept } = await cleanupStorage(userId, keep);
  await markPending(userId, userEmail, {
    storage_deleted_at: new Date().toISOString(),
    status: "auth_pending",
  });

  // 4. Auth user deletion — LAST.
  const authResult = await finalizeAuthDeletion(userId, userEmail);

  if (authResult.ok) {
    console.info("[delete-account] completed", {
      userId,
      removedFiles: removed,
      keptFiles: kept,
      rpc: rpcResult,
    });
    return {
      status: "completed",
      rpc: rpcResult,
      removedFiles: removed,
      keptFiles: kept,
    };
  }

  return {
    status: "auth_pending",
    rpc: rpcResult,
    removedFiles: removed,
    keptFiles: kept,
    authError: authResult.error,
  };
}

/**
 * Delete the Supabase auth user. Treats "user not found" as success
 * (idempotent). On other failures, records pending state for retry.
 */
export async function finalizeAuthDeletion(
  userId: string,
  userEmail: string | null,
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);

  if (!error) {
    await supabaseAdmin
      .from("pending_account_deletions")
      .delete()
      .eq("user_id", userId);
    return { ok: true };
  }

  const msg = error.message ?? "unknown";
  // Already gone — clean up the pending marker and treat as done.
  if (/not.?found/i.test(msg) || (error as { status?: number }).status === 404) {
    await supabaseAdmin
      .from("pending_account_deletions")
      .delete()
      .eq("user_id", userId);
    return { ok: true };
  }

  console.error("[delete-account] auth deletion failed", { userId, msg });
  await markPending(userId, userEmail, {
    status: "auth_pending",
    last_error: msg,
  });
  return { ok: false, error: msg };
}
