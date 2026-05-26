"use server";

import { revalidatePath } from "next/cache";

import {
  validateProfileId,
} from "./lib/dashboard-guards";

import {
  logProfileSwitch,
} from "./lib/dashboard-telemetry";

import {
  setActiveProfile as saveActiveProfile,
} from "@/lib/active-profile";

const DASHBOARD_PATH = "/dashboard";

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

  logProfileSwitch({
    profileId:
      normalizedProfileId,
  });

  revalidatePath(
    DASHBOARD_PATH
  );

  return {
    success: true,
    profileId:
      normalizedProfileId,
  };
}