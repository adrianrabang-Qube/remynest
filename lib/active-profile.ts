import { cookies } from "next/headers";

const COOKIE_NAME =
  "remynest-active-context";

export type ActiveContext =
  | {
      type: "PERSONAL";
    }
  | {
      type: "CARE";
      profileId: string;
    };

export async function setActiveContext(
  context: ActiveContext
) {
  const cookieStore =
    await cookies();

  cookieStore.set(
    COOKIE_NAME,
    JSON.stringify(context),
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

export async function getActiveContext():
Promise<ActiveContext> {
  const cookieStore =
    await cookies();

  const value =
    cookieStore.get(
      COOKIE_NAME
    )?.value;

  if (!value) {
    return {
      type: "PERSONAL",
    };
  }

  try {
    return JSON.parse(
      value
    ) as ActiveContext;
  } catch {
    return {
      type: "PERSONAL",
    };
  }
}

export async function clearActiveContext() {
  const cookieStore =
    await cookies();

  cookieStore.delete(
    COOKIE_NAME
  );
}