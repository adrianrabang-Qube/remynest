import { createClient } from "@/utils/supabase/server";

export async function getAccessibleProfiles() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  // Own profiles
  const { data: ownedProfiles, error: ownedError } = await supabase
    .from("memory_profiles")
    .select("*")
    .eq("created_by_account_id", user.id);

  if (ownedError) {
    console.error("Owned profiles error:", ownedError);
  }

  // Shared caregiver relationships
  const { data: relationships, error: relationshipError } = await supabase
    .from("profile_relationships")
    .select(`
      memory_profile_id,
      access_level,
      relationship_type,
      memory_profiles (*)
    `)
    .eq("caregiver_account_id", user.id);

  if (relationshipError) {
    console.error("Relationship error:", relationshipError);
  }

  const sharedProfiles =
    relationships?.map((r: any) => ({
      ...r.memory_profiles,
      access_level: r.access_level,
      relationship_type: r.relationship_type,
      shared: true,
    })) || [];

  return [...(ownedProfiles || []), ...sharedProfiles];
}