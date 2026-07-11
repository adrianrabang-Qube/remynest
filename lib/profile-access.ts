import { cache } from "react";

import { createClient } from "@/utils/supabase/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { logger, errorMessage } from "@/lib/logger";

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

  // RC4: dev-only, ID-only — never log user.email or full profile rows
  // (care-recipient name/DOB/relationship = PHI/PII); this runs on every navigation.
  logger.debug("[profile-access] resolving", { userId: user.id });

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

  logger.debug("[profile-access] owned", {
    userId: user.id,
    ownedProfilesCount: ownedProfiles?.length || 0,
  });

  if (ownedError) {
    logger.error(
      "[profile-access] owned profiles error",
      errorMessage(ownedError)
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
    )
    // Only an ACCEPTED relationship grants access — matches userCanAccessProfile + RLS +
    // the delete/GDPR model. A pending/revoked-by-status row must NOT surface a profile as
    // accessible (which would grant premature read access to its memories/stats).
    .eq("invite_status", "accepted");

  if (relationshipError) {
    logger.error(
      "[profile-access] relationship error",
      errorMessage(relationshipError)
    );
  }

  if (
    !relationships ||
    relationships.length === 0
  ) {
    logger.debug("[profile-access] no relationships", {
      ownedProfilesCount: ownedProfiles?.length || 0,
      sharedProfilesCount: 0,
    });

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
    logger.error(
      "[profile-access] shared profiles error",
      errorMessage(sharedProfilesError)
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

  logger.debug("[profile-access] merged", {
    ownedProfilesCount: ownedProfiles?.length || 0,
    sharedProfilesCount: sharedProfiles?.length || 0,
  });

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

  logger.debug("[profile-access] accessible", {
    userId: user.id,
    count: dedupedProfiles?.length || 0,
  });

  return dedupedProfiles;
});