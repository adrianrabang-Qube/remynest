import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { buildRelationships } from "@/lib/build-relationships";
import { logger, errorMessage } from "@/lib/logger";
import { captureError } from "@/lib/observability/capture";

// RC4: relationship-building can run long on larger graphs.
export const maxDuration = 60;

export async function POST(
  req: Request
) {
  try {

    // Authenticate — this route was previously unauthenticated. Ownership of the
    // memoryId is additionally enforced inside buildRelationships (owner-scoped fetch).
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body =
      await req.json();

    const memoryId =
      body.memoryId;

    if (!memoryId) {
      return NextResponse.json(
        {
          error:
            "Memory ID required",
        },
        {
          status: 400,
        }
      );
    }

    const result =
      await buildRelationships(
        memoryId
      );

    return NextResponse.json(
      result
    );

  } catch (error) {

    logger.error(
      "[build-relationships] failed",
      errorMessage(error)
    );
    captureError(error, { route: "build-relationships" });

    return NextResponse.json(
      {
        error:
          "Server error",
      },
      {
        status: 500,
      }
    );
  }
}