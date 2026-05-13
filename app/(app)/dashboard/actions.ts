"use server";

import { createClient } from "@/utils/supabase/server";

export async function createProfile(
  formData: FormData
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  const profileName = formData.get(
    "profile_name"
  ) as string;

  const preferredName = formData.get(
    "preferred_name"
  ) as string;

  const dob = formData.get(
    "date_of_birth"
  ) as string;

  // CREATE MEMORY PROFILE
  const {
    data: profile,
    error: profileError,
  } = await supabase
    .from("memory_profiles")
    .insert({
      profile_name: profileName,
      preferred_name: preferredName,
      date_of_birth: dob || null,
      created_by_account_id: user.id,
      subscription_status: "free",
    })
    .select()
    .single();

  if (profileError) {
    console.error(profileError);

    throw new Error(
      "Failed to create profile"
    );
  }

  // CREATE OWNER RELATIONSHIP
  const { error: relationshipError } =
    await supabase
      .from("profile_relationships")
      .insert({
        memory_profile_id: profile.id,
        caregiver_account_id: user.id,
        relationship_type: "owner",
        access_level: "full",
        invite_status: "accepted",
        invited_by_account_id: user.id,
      });

  if (relationshipError) {
    console.error(relationshipError);

    throw new Error(
      "Failed to create relationship"
    );
  }

  return {
    success: true,
  };
}