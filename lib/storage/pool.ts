/**
 * Resolve the set of user ids whose storage counts against the SAME pool as
 * `userId`. Today every user is their own pool (`[userId]`); a future FAMILY plan
 * returns all member user ids here — the ONLY change needed to make pooled
 * enforcement work end-to-end. Async on purpose (a real pool is a DB lookup).
 *
 * Keeping this as the single resolution point is what lets the upload enforcement
 * path stay free of single-user assumptions.
 */
export async function resolveStoragePoolMembers(
  userId: string
): Promise<string[]> {
  return [userId];
}
