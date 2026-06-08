import { supabaseAdmin } from "@/utils/supabase/admin";

/**
 * Authoritative, DB-backed check that `userId` may write to `profileId`.
 *
 * Access = the user OWNS the care profile (`memory_profiles.created_by_account_id`)
 * OR has an accepted/explicit caregiver relationship to it
 * (`profile_relationships.caregiver_account_id`). Uses the service-role client so
 * the verification does not depend on RLS context — callers MUST pass a
 * session-derived `userId` (never a client-supplied id).
 *
 * Same access model as `getAccessibleProfiles` (lib/profile-access.ts).
 */
export async function userCanAccessProfile(
  userId: string,
  profileId: string
): Promise<boolean> {
  if (!userId || !profileId) return false;

  const { data: owned } = await supabaseAdmin
    .from("memory_profiles")
    .select("id")
    .eq("id", profileId)
    .eq("created_by_account_id", userId)
    .maybeSingle();
  if (owned) return true;

  const { data: shared } = await supabaseAdmin
    .from("profile_relationships")
    .select("memory_profile_id")
    .eq("memory_profile_id", profileId)
    .eq("caregiver_account_id", userId)
    .maybeSingle();

  return Boolean(shared);
}
