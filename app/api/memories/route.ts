import { randomUUID } from "crypto";

import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { resolveActiveProfileId } from "@/lib/context-resolver";
import { signMemories, stripEmbedding } from "@/lib/memory-media-signing";
import { logger, errorMessage } from "@/lib/logger";

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

    const explicitProfileId =
      searchParams.get(
        "profileId"
      );

    const explicitWorkspaceType =
      searchParams.get(
        "workspaceType"
      );

    const normalizedExplicitProfileId =
      explicitProfileId?.trim() || null;

    const normalizedProfileId =
      normalizedExplicitProfileId &&
      normalizedExplicitProfileId !== "null" &&
      normalizedExplicitProfileId !== "undefined"
        ? normalizedExplicitProfileId
        : null;

    const normalizedWorkspaceType =
      explicitWorkspaceType === "my-nest" ||
      explicitWorkspaceType === "care"
        ? explicitWorkspaceType
        : null;

    if (
      explicitWorkspaceType &&
      !normalizedWorkspaceType
    ) {
      console.warn(
        `${MEMORIES_API_TAG} invalid-workspace-type`,
        {
          requestId,
          workspaceType:
            explicitWorkspaceType,
        }
      );
    }

    const resolvedProfileId =
      await resolveActiveProfileId();

    const profileId =
      normalizedWorkspaceType ===
      "my-nest"
        ? null
        : normalizedProfileId ??
          resolvedProfileId;

    const isPersonalWorkspace =
      profileId === null;

    console.log(
      `${MEMORIES_API_TAG} fetch-started`,
      {
        requestId,
        userId: user.id,
        profileId,
        workspaceType:
          isPersonalWorkspace
            ? "my-nest"
            : "care",
      }
    );

    // Pagination — bounds the per-request transform-signing fan-out (thumbs use
    // singular createSignedUrl calls). Defaults preserve a generous page so most
    // users still load in one request; the client aggregates pages.
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

    let memoriesQuery =
      supabase
        .from("memories")
        .select("*")
        .eq("user_id", user.id);

    if (
      isPersonalWorkspace
    ) {
      memoriesQuery =
        memoriesQuery.is(
          "memory_profile_id",
          null
        );
    } else {
      memoriesQuery =
        memoriesQuery.eq(
          "memory_profile_id",
          profileId
        );
    }

    const { data, error } =
      await memoriesQuery
        .order("created_at", {
          ascending: false,
        })
        // Deterministic tiebreaker so offset paging is stable across the
        // client's separate page requests (created_at is not unique).
        .order("id", { ascending: false })
        .range(offset, offset + limit - 1);

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

    const signedData = stripEmbedding(
      await signMemories(data ?? [], {
        variant: "thumb",
        maxImagesPerMemory: 4,
      })
    );

    return NextResponse.json({
      data: signedData,
      metadata: {
        requestId,
        profileId,
        workspaceType:
          isPersonalWorkspace
            ? "my-nest"
            : "care",
        memoryCount:
          data?.length ?? 0,
        limit,
        offset,
        hasMore: (data?.length ?? 0) === limit,
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

    logger.error(
      `${MEMORIES_API_TAG} request-crashed`,
      {
        requestId,
        durationMs,
        error: errorMessage(error),
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