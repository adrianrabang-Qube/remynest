import { NextRequest, NextResponse } from "next/server";

import {
  getActiveProfile,
  setActiveProfile,
} from "@/lib/active-profile";

import { createClient } from "@/lib/supabase/server";

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

    let activeProfileId =
      await getActiveProfile();

    // =========================
    // FALLBACK PROFILE
    // =========================
    if (!activeProfileId) {
      const { data: profiles } =
        await supabase
          .from("memory_profiles")
          .select("id")
          .eq("user_id", user.id)
          .limit(1);

      const fallbackProfileId =
        profiles?.[0]?.id;

      if (fallbackProfileId) {
        await setActiveProfile(
          fallbackProfileId
        );

        activeProfileId =
          fallbackProfileId;
      }
    }

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
    console.error(error);

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

    await setActiveProfile(
      profileId
    );

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(error);

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