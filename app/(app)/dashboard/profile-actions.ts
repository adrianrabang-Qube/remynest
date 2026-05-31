"use server";

import { revalidatePath } from "next/cache";

import {
  validateProfileId,
} from "./lib/dashboard-guards";

import {
  logProfileSwitch,
} from "./lib/dashboard-telemetry";

import {
  setActiveContext,
} from "@/lib/active-profile";

const DASHBOARD_PATH = "/dashboard";

export async function setActiveProfile(
  profileId: string
) {
  const normalizedProfileId =
    validateProfileId(
      profileId
    );

  await setActiveContext({
    type: "CARE",
    profileId:
      normalizedProfileId,
  });

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