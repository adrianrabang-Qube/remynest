import { cookies } from "next/headers";
import { cache } from "react";

import { createClient } from "@/lib/supabase/server";
import { userCanAccessProfile } from "@/lib/profile-ownership";

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

/** Raw cookie parse — UNVALIDATED. Never returns a CARE context to callers directly. */
async function readRawContext(): Promise<ActiveContext> {
  const cookieStore = await cookies();
  const value = cookieStore.get(COOKIE_NAME)?.value;

  if (!value) {
    return { type: "PERSONAL" };
  }

  try {
    return JSON.parse(value) as ActiveContext;
  } catch {
    return { type: "PERSONAL" };
  }
}

/**
 * The active workspace context, VALIDATED against the session user.
 *
 * SECURITY: the `remynest-active-context` cookie is client-settable (httpOnly stops JS
 * reads, but an authenticated attacker can forge the raw Cookie header). So a CARE context
 * is trusted ONLY when the session user actually owns / has an ACCEPTED caregiver
 * relationship to that profile (`userCanAccessProfile`); otherwise it fails closed to
 * PERSONAL. This is the single authoritative gate that stops a forged cookie from steering
 * every downstream memory READ (routes, pages, and all Remy readers derive their
 * memory_profile_id from here) into another tenant's care profile. `cache()` dedupes the
 * validation to once per request.
 */
export const getActiveContext = cache(
  async (): Promise<ActiveContext> => {
    const raw = await readRawContext();
    if (raw.type !== "CARE") {
      return { type: "PERSONAL" };
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { type: "PERSONAL" };
    }

    const allowed = await userCanAccessProfile(user.id, raw.profileId);
    return allowed ? raw : { type: "PERSONAL" };
  }
);

export async function clearActiveContext() {
  const cookieStore =
    await cookies();

  cookieStore.delete(
    COOKIE_NAME
  );
}