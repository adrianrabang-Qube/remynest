export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

import { resolveActiveProfileId } from "@/lib/context-resolver";
import { signMemories } from "@/lib/memory-media-signing";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const parsedLimit = Number.parseInt(
      searchParams.get("limit") ?? "",
      10
    );
    const limit =
      Number.isFinite(parsedLimit) && parsedLimit > 0
        ? Math.min(parsedLimit, 100)
        : 50;
    const parsedOffset = Number.parseInt(
      searchParams.get("offset") ?? "",
      10
    );
    const offset =
      Number.isFinite(parsedOffset) && parsedOffset > 0
        ? parsedOffset
        : 0;

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
      await resolveActiveProfileId();

    console.info(
      "[TIMELINE_API_CONTEXT]",
      {
        activeProfileId,
      }
    );

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
        })
        // Deterministic tiebreaker so offset paging is stable (created_at is not unique).
        .order("id", { ascending: false })
        .range(offset, offset + limit - 1);

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
      await signMemories(data || [], {
        variant: "thumb",
        maxImagesPerMemory: 4,
      })
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