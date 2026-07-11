import { NextRequest, NextResponse } from "next/server";

import {
  getActiveContext,
  setActiveContext,
} from "@/lib/active-profile";

import { resolveActiveProfileId } from "@/lib/context-resolver";

import { createClient } from "@/lib/supabase/server";
import { userCanAccessProfile } from "@/lib/profile-ownership";
import { logger, errorMessage } from "@/lib/logger";

// =========================
// GET ACTIVE PROFILE
// =========================
export async function GET() {
  try {
    const supabase =
  await createClient();

    const {
      data: { user },
    } =
      await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        {
          error: "Unauthorized",
        },
        {
          status: 401,
        }
      );
    }

    const activeContext =
      await getActiveContext();

    const activeProfileId =
      await resolveActiveProfileId();

    logger.debug(
      "[ACTIVE_PROFILE_API]",
      {
        activeContext,
        activeProfileId,
      }
    );

    if (!activeProfileId) {
      return NextResponse.json({
        activeProfileId: null,
      });
    }

    const { data: profile } =
      await supabase
        .from("memory_profiles")
        .select("*")
        .eq("id", activeProfileId)
        .single();

    return NextResponse.json({
      activeProfileId,
      profile,
    });
  } catch (error) {
    logger.error("[active-profile] request failed", errorMessage(error));

    return NextResponse.json(
      {
        error:
          "Failed to load active profile",
      },
      {
        status: 500,
      }
    );
  }
}

// =========================
// SET ACTIVE PROFILE
// =========================
export async function POST(
  request: NextRequest
) {
  try {
    // RC2: auth-gate + authorize the target profile BEFORE writing the workspace cookie.
    // (getActiveContext also re-validates on read, but rejecting a forged/foreign profileId at
    // WRITE time is defense-in-depth — no unauthorized cookie is ever set.)
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body =
      await request.json();

    const profileId =
      body.profileId;

    if (!profileId) {
      return NextResponse.json(
        {
          error:
            "Missing profileId",
        },
        {
          status: 400,
        }
      );
    }

    if (!(await userCanAccessProfile(user.id, profileId))) {
      return NextResponse.json(
        { error: "You don't have access to this care profile." },
        { status: 403 }
      );
    }

    await setActiveContext({
      type: "CARE",
      profileId,
    });

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    logger.error("[active-profile] request failed", errorMessage(error));

    return NextResponse.json(
      {
        error:
          "Failed to set active profile",
      },
      {
        status: 500,
      }
    );
  }
}