import { cache } from "react";

import { createClient } from "@/utils/supabase/server";
import { getCurrentUser } from "@/lib/auth/current-user";

type ProfileRelationship = {
  memory_profile_id: string;
  access_level?: string | null;
  relationship_type?: string | null;
};

type MemoryProfile = {
  id: string;
  created_by_account_id?: string;
  access_level?: string | null;
  relationship_type?: string | null;
  shared?: boolean;
  [key: string]: unknown;
};

// cache(): request-level dedup. This runs in BOTH the (app) layout and the page
// (dashboard/profile/etc.) on a single navigation; memoizing collapses the two
// full executions (3-4 redundant Supabase round-trips) into one per request.
export const getAccessibleProfiles = cache(async () => {
  const supabase = await createClient();

  const user = await getCurrentUser();

  if (!user) {
    return [];
  }

  console.info(
    "[PROFILE_ACCESS_USER]",
    {
      userId: user.id,
      userEmail: user.email,
    }
  );

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

  console.info(
    "[OWNED_PROFILES_DEBUG]",
    {
      userId: user.id,
      ownedProfilesCount:
        ownedProfiles?.length || 0,
      ownedProfiles,
    }
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
    console.log(
      "[getAccessibleProfiles]",
      {
        ownedProfilesCount:
          ownedProfiles?.length,
        sharedProfilesCount: 0,
        ownedProfiles,
        sharedProfiles: [],
        reason:
          "no relationships found",
      }
    );

    return ownedProfiles || [];
  }

  // GET PROFILE IDS
  const profileIds = relationships.map(
    (r: ProfileRelationship) => r.memory_profile_id
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
      (profile: MemoryProfile) => {
        const relationship =
          relationships.find(
            (r: ProfileRelationship) =>
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

  console.log(
    "[getAccessibleProfiles]",
    {
      ownedProfilesCount:
        ownedProfiles?.length,
      sharedProfilesCount:
        sharedProfiles?.length,
      ownedProfiles,
      sharedProfiles,
    }
  );

  const mergedProfiles = [
    ...(ownedProfiles || []),
    ...sharedProfiles,
  ];

  const dedupedProfiles = Array.from(
    new Map(
      mergedProfiles.map(
        (profile: MemoryProfile) => [
          profile.id,
          profile,
        ]
      )
    ).values()
  );

  console.info(
    "[ACCESSIBLE_PROFILES_DEBUG]",
    {
      userId: user.id,
      count:
        dedupedProfiles?.length || 0,
      profiles: dedupedProfiles,
    }
  );

  return dedupedProfiles;
});