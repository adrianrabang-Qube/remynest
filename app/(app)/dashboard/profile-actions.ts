"use server";

import { revalidatePath } from "next/cache";

import {
  setActiveProfile as saveActiveProfile,
} from "@/lib/active-profile";

const DASHBOARD_PATH = "/dashboard";

function validateProfileId(
  profileId: string
) {
  const normalized =
    String(profileId).trim();

  if (!normalized) {
    throw new Error(
      "Profile ID is required"
    );
  }

  return normalized;
}

export async function setActiveProfile(
  profileId: string
) {
  const normalizedProfileId =
    validateProfileId(
      profileId
    );

  await saveActiveProfile(
    normalizedProfileId
  );

  revalidatePath(
    DASHBOARD_PATH
  );

  return {
    success: true,
    profileId:
      normalizedProfileId,
  };
}