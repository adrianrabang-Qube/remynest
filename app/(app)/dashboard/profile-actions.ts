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

  revalidatePath("/", "layout");

  return {
    success: true,
    profileId:
      normalizedProfileId,
  };
}

export async function setPersonalWorkspace() {
  await setActiveContext({
    type: "PERSONAL",
  });

  revalidatePath("/", "layout");

  return {
    success: true,
    workspace: "my-nest",
  };
}