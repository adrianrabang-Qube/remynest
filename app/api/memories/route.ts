import { randomUUID } from "crypto";

import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

export { POST } from "./create/route";

// Enterprise route delegation:
// POST creation logic is centralized in
// app/api/memories/create/route.ts
// while GET remains isolated here for
// observability and response tracing.

const MEMORIES_API_TAG = "[memories-api]";

export async function GET(
  request: NextRequest
) {
  const requestId = randomUUID();
  const startedAt = performance.now();

  console.log(
    `${MEMORIES_API_TAG} request-started`,
    {
      requestId,
      pathname:
        request.nextUrl.pathname,
      method: request.method,
    }
  );

  try {
    const supabase =
      await createClient();

    const {
      data: { user },
      error: authError,
    } =
      await supabase.auth.getUser();

    if (authError) {
      console.error(
        `${MEMORIES_API_TAG} auth-failed`,
        {
          requestId,
          message:
            authError.message,
        }
      );

      return NextResponse.json(
        {
          error:
            "Authentication failed",
          requestId,
        },
        {
          status: 401,
        }
      );
    }

    if (!user) {
      console.warn(
        `${MEMORIES_API_TAG} unauthorized`,
        {
          requestId,
        }
      );

      return NextResponse.json(
        {
          error: "Unauthorized",
          requestId,
        },
        {
          status: 401,
        }
      );
    }

    const searchParams =
      request.nextUrl.searchParams;

    const profileId =
      searchParams.get(
        "profileId"
      );

    if (!profileId) {
      console.warn(
        `${MEMORIES_API_TAG} missing-profile-id`,
        {
          requestId,
          userId: user.id,
        }
      );

      return NextResponse.json(
        {
          data: [],
          metadata: {
            requestId,
            empty: true,
            reason:
              "NO_PROFILE_SELECTED",
          },
        }
      );
    }

    console.log(
      `${MEMORIES_API_TAG} fetch-started`,
      {
        requestId,
        userId: user.id,
        profileId,
      }
    );

    const { data, error } =
      await supabase
        .from("memories")
        .select("*")
        .eq("user_id", user.id)
        .eq(
          "memory_profile_id",
          profileId
        )
        .order("created_at", {
          ascending: false,
        });

    if (error) {
      console.error(
        `${MEMORIES_API_TAG} fetch-failed`,
        {
          requestId,
          profileId,
          message: error.message,
        }
      );

      return NextResponse.json(
        {
          error:
            "Failed to fetch memories",
          requestId,
        },
        {
          status: 500,
        }
      );
    }

    const durationMs = Number(
      (
        performance.now() -
        startedAt
      ).toFixed(2)
    );

    console.log(
      `${MEMORIES_API_TAG} request-completed`,
      {
        requestId,
        profileId,
        memoryCount:
          data?.length ?? 0,
        durationMs,
      }
    );

    return NextResponse.json({
      data,
      metadata: {
        requestId,
        profileId,
        memoryCount:
          data?.length ?? 0,
        durationMs,
      },
    });
  } catch (error) {
    const durationMs = Number(
      (
        performance.now() -
        startedAt
      ).toFixed(2)
    );

    console.error(
      `${MEMORIES_API_TAG} request-crashed`,
      {
        requestId,
        durationMs,
        error,
      }
    );

    return NextResponse.json(
      {
        error: "Server error",
        requestId,
      },
      {
        status: 500,
      }
    );
  }
}