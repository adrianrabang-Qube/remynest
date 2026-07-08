import { supabaseAdmin } from "@/utils/supabase/admin";

export type ProfileRole = "owner" | "caregiver" | "none";

export interface ProfileRoleResolution {
  role: ProfileRole;
  /** The caregiver's access_level; null for owner / no relationship. */
  accessLevel: string | null;
}

/**
 * The SINGLE authorization query path for a user's relationship to a care profile — the one
 * place that decides owner-vs-caregiver-vs-none, so `userCanAccessProfile` and
 * `userCanWriteProfile` derive from it (no duplicated logic).
 *
 * Owner = `memory_profiles.created_by_account_id`. Caregiver = an ACCEPTED
 * `profile_relationships` row (its `access_level` is returned so callers can enforce it).
 * Uses the service-role client so the check does not depend on RLS context — callers MUST
 * pass a session-derived `userId` (never a client-supplied id). Does NOT trust a
 * pending/revoked-by-status relationship row.
 */
async function resolveProfileRole(
  userId: string,
  profileId: string
): Promise<ProfileRoleResolution> {
  if (!userId || !profileId) return { role: "none", accessLevel: null };

  const { data: owned } = await supabaseAdmin
    .from("memory_profiles")
    .select("id")
    .eq("id", profileId)
    .eq("created_by_account_id", userId)
    .maybeSingle();
  if (owned) return { role: "owner", accessLevel: null };

  const { data: shared } = await supabaseAdmin
    .from("profile_relationships")
    .select("access_level")
    .eq("memory_profile_id", profileId)
    .eq("caregiver_account_id", userId)
    // Only an ACCEPTED relationship grants access — matches the authoritative model used by
    // RLS, the delete-account RPC, and GDPR (a pending/revoked-by-status row must NOT grant
    // access). Without this, the sole app-layer gate for care-profile access admits
    // non-accepted rows.
    .eq("invite_status", "accepted")
    .maybeSingle();

  if (shared) {
    const level = (shared as { access_level?: string | null }).access_level;
    return {
      role: "caregiver",
      accessLevel: typeof level === "string" ? level : null,
    };
  }

  return { role: "none", accessLevel: null };
}

/**
 * The single source of truth for what a caregiver `access_level` permits. The invite UI
 * offers exactly `read` | `full` | `admin` (defaulting to `full`).
 *
 * Only an explicit read-only grant restricts writing. Every other value — `full`, `admin`,
 * and legacy/null rows created before the read-only tier existed — remains write-capable, so
 * enforcement never silently strips write access from an existing caregiver. The OWNER is
 * authorized by ownership, not by this level (see `userCanWriteProfile`).
 */
export function accessLevelCanWrite(
  accessLevel: string | null | undefined
): boolean {
  return accessLevel !== "read";
}

/**
 * DB-backed check that `userId` may ACCESS (enter / read) `profileId`: the user OWNS the care
 * profile OR has an accepted caregiver relationship. Read-only caregivers pass — access is
 * not write (writes gate on `userCanWriteProfile`). Behavior is identical to the prior direct
 * implementation (owner OR accepted → true). Callers MUST pass a session-derived `userId`.
 *
 * Same access model as `getAccessibleProfiles` (lib/profile-access.ts).
 */
export async function userCanAccessProfile(
  userId: string,
  profileId: string
): Promise<boolean> {
  const { role } = await resolveProfileRole(userId, profileId);
  return role !== "none";
}

/**
 * Authoritative, DB-backed check that `userId` may WRITE to `profileId` — create / complete /
 * delete memories and reminders in the workspace. The OWNER always may; an accepted caregiver
 * may ONLY if their `access_level` permits it (`accessLevelCanWrite`). This is THE enforcement
 * point for the caregiver access-level model: every care-profile WRITE path gates on this, not
 * on `userCanAccessProfile`. Callers MUST pass a session-derived `userId`.
 */
export async function userCanWriteProfile(
  userId: string,
  profileId: string
): Promise<boolean> {
  const { role, accessLevel } = await resolveProfileRole(userId, profileId);
  if (role === "owner") return true;
  if (role === "caregiver") return accessLevelCanWrite(accessLevel);
  return false;
}

/**
 * Strict OWNERSHIP check (not mere caregiver access). Use for actions only the profile owner
 * may perform — e.g. inviting / listing / revoking caregivers. Service-role query, so `userId`
 * MUST be session-derived. Does NOT trust `profile_relationships` (the table being protected
 * against forgery).
 */
export async function userOwnsProfile(
  userId: string,
  profileId: string
): Promise<boolean> {
  if (!userId || !profileId) return false;

  const { data } = await supabaseAdmin
    .from("memory_profiles")
    .select("id")
    .eq("id", profileId)
    .eq("created_by_account_id", userId)
    .maybeSingle();

  return Boolean(data);
}
