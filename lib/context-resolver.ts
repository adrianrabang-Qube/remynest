import { getActiveContext } from "@/lib/active-profile";

export async function resolveActiveProfileId(): Promise<string | null> {
  const context = await getActiveContext();

  return context.type === "CARE"
    ? context.profileId
    : null;
}