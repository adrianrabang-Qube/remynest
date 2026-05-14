import { createClient } from "@/utils/supabase/server";

export async function getAccessibleProfiles() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  // OWNED PROFILES
  const {
    data: ownedProfiles,
    error: ownedError,
  } = await supabase
    .from("memory_profiles")
    .select("*")
    .eq(
      "created_by_account_id",
      user.id
    );

  if (ownedError) {
    console.error(
      "Owned profiles error:",
      ownedError
    );
  }

  // RELATIONSHIPS
  const {
    data: relationships,
    error: relationshipError,
  } = await supabase
    .from("profile_relationships")
    .select("*")
    .eq(
      "caregiver_account_id",
      user.id
    );

  if (relationshipError) {
    console.error(
      "Relationship error:",
      relationshipError
    );
  }

  if (
    !relationships ||
    relationships.length === 0
  ) {
    return ownedProfiles || [];
  }

  // GET PROFILE IDS
  const profileIds = relationships.map(
    (r: any) => r.memory_profile_id
  );

  // FETCH SHARED PROFILES
  const {
    data: sharedProfilesData,
    error: sharedProfilesError,
  } = await supabase
    .from("memory_profiles")
    .select("*")
    .in("id", profileIds);

  if (sharedProfilesError) {
    console.error(
      "Shared profiles error:",
      sharedProfilesError
    );
  }

  // MERGE RELATIONSHIP DATA
  const sharedProfiles =
    sharedProfilesData?.map(
      (profile: any) => {
        const relationship =
          relationships.find(
            (r: any) =>
              r.memory_profile_id ===
              profile.id
          );

        return {
          ...profile,
          access_level:
            relationship?.access_level,
          relationship_type:
            relationship?.relationship_type,
          shared: true,
        };
      }
    ) || [];

  return [
    ...(ownedProfiles || []),
    ...sharedProfiles,
  ];
}