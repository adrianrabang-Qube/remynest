import type { SupabaseClient } from "@supabase/supabase-js";

const BUCKET = "memory-media";

/** Strip leading slashes so paths compare/list consistently. */
export function normalizeStoragePath(path: unknown): string | null {
  if (typeof path !== "string") return null;
  const clean = path.trim().replace(/^\/+/, "");
  return clean || null;
}

/**
 * Owner-scope guard. Every memory media object must live under the user's prefix
 * (`users/{userId}/...`) — the path the sign endpoint generates. This blocks a client
 * from submitting a storagePath that points at ANOTHER user's object (reference theft)
 * or any path it did not legitimately receive an upload URL for.
 */
export function isOwnedStoragePath(path: unknown, userId: string): boolean {
  const clean = normalizeStoragePath(path);
  return clean != null && clean.startsWith(`users/${userId}/`);
}

/**
 * Server-AUTHORITATIVE object info, read straight from Supabase Storage (never the
 * client). `exists` is whether the object is really in the bucket (drops phantoms /
 * blocks referencing objects that were never uploaded); `size` is the real byte size
 * (null only if Storage didn't surface it — callers fall back to the reported size for a
 * confirmed-existing object so a real upload is never silently dropped). Used at
 * create/edit to re-verify quota against reality, so a client cannot under-report sizes
 * at sign time to slip past the quota.
 */
export async function getStorageObjectInfo(
  supabase: SupabaseClient,
  path: string,
): Promise<{ exists: boolean; size: number | null }> {
  const clean = normalizeStoragePath(path);
  if (!clean) return { exists: false, size: null };
  const slash = clean.lastIndexOf("/");
  if (slash < 0) return { exists: false, size: null };
  const folder = clean.slice(0, slash);
  const name = clean.slice(slash + 1);

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .list(folder, { search: name, limit: 100 });
  if (error || !data) return { exists: false, size: null };

  const match = data.find((o) => o.name === name);
  if (!match) return { exists: false, size: null };

  const size = (match.metadata as { size?: unknown } | undefined)?.size;
  return {
    exists: true,
    size: typeof size === "number" && Number.isFinite(size) ? size : null,
  };
}

/**
 * Best-effort cleanup of objects we just rejected (e.g. an over-quota batch). NOTE: this
 * only cleans the batch in hand — there is no background orphan-sweeper yet, so an upload
 * that is never attached to a memory still occupies bucket space the ledger does not count
 * (see docs/features/media-system.md "direct-to-storage" follow-ups).
 */
export async function removeStorageObjects(
  supabase: SupabaseClient,
  paths: string[],
): Promise<void> {
  const clean = paths
    .map((p) => normalizeStoragePath(p))
    .filter((p): p is string => p != null);
  if (clean.length === 0) return;
  try {
    await supabase.storage.from(BUCKET).remove(clean);
  } catch {
    /* best-effort */
  }
}
