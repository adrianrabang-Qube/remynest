import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

import {
  getActiveProfile,
} from "@/lib/active-profile";

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

    const activeProfileId =
      await getActiveProfile();

    if (!activeProfileId) {
      return NextResponse.json([]);
    }

    const { data, error } =
      await supabase
        .from("memories")
        .select("*")
        .eq(
          "memory_profile_id",
          activeProfileId
        )
        .order("created_at", {
          ascending: false,
        });

    if (error) {
      console.log(error);

      return NextResponse.json(
        {
          error:
            "Failed to fetch timeline",
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json(
      data || []
    );
  } catch (error) {
    console.log(error);

    return NextResponse.json(
      {
        error: "Server error",
      },
      {
        status: 500,
      }
    );
  }
}