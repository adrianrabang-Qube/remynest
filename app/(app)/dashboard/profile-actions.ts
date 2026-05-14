"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

export async function setActiveProfile(
  profileId: string
) {
  const cookieStore = await cookies();

  cookieStore.set(
    "active_profile_id",
    profileId,
    {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
    }
  );

  revalidatePath("/dashboard");

  return {
    success: true,
  };
}