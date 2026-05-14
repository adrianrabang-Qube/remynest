import { cookies } from "next/headers";

const COOKIE_NAME =
  "remynest-active-profile";

export async function setActiveProfile(
  profileId: string
) {
  const cookieStore =
    await cookies();

  cookieStore.set(
    COOKIE_NAME,
    profileId,
    {
      httpOnly: true,
      secure:
        process.env.NODE_ENV ===
        "production",
      sameSite: "lax",
      path: "/",
    }
  );
}

export async function getActiveProfile() {
  const cookieStore =
    await cookies();

  return (
    cookieStore.get(
      COOKIE_NAME
    )?.value || null
  );
}