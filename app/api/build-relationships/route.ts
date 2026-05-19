import { NextResponse } from "next/server";

import { buildRelationships } from "@/lib/build-relationships";

export async function POST(
  req: Request
) {
  try {

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

    console.log(
      "❌ BUILD RELATIONSHIPS ERROR"
    );

    console.log(error);

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