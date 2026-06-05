/**
 * Anonymised-author ("Deleted Contributor") tombstone used for cross-contributed
 * memories that are RETAINED on account deletion.
 *
 * Because `memories.user_id REFERENCES auth.users(id)` (ON DELETE CASCADE, NOT
 * NULL), the tombstone MUST be a real auth.users row. The Supabase Admin API
 * cannot create a user with a fixed UUID, so the tombstone is provisioned once
 * via `provisionTombstone()` and its generated id is stored in the
 * `TOMBSTONE_USER_ID` env var. All consumers read it from there.
 */

export const TOMBSTONE_DISPLAY_NAME = "Deleted Contributor";
export const TOMBSTONE_EMAIL = "deleted-contributor@system.remynest.internal";

/** Storage bucket holding user-uploaded media. */
export const MEDIA_BUCKET = "memory-media";

/** Per-user storage prefix convention: `users/{userId}/...`. */
export function userStoragePrefix(userId: string): string {
  return `users/${userId}`;
}

/**
 * Returns the configured tombstone user id, or throws if it has not been
 * provisioned. Run `provisionTombstone()` once and set TOMBSTONE_USER_ID.
 */
export function getTombstoneUserId(): string {
  const id = process.env.TOMBSTONE_USER_ID;
  if (!id) {
    throw new Error(
      "TOMBSTONE_USER_ID is not set — run provisionTombstone() once and set the env var.",
    );
  }
  return id;
}
