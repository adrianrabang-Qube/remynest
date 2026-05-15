"use server";

import {
  setActiveProfile as saveActiveProfile,
} from "@/lib/active-profile";

export async function setActiveProfile(
  profileId: string
) {
  await saveActiveProfile(
    profileId
  );

  return {
    success: true,
  };
}