import { NextResponse } from "next/server";

import { createClient } from "@supabase/supabase-js";
import { logger, errorMessage } from "@/lib/logger";

const DEVICE_REGISTRATION_TAG =
  "device-registration-engine";

const PLAYER_ID_MAX_LENGTH =
  512;

function logDeviceRegistrationStage(
  stage: string,
  metadata?: unknown
) {
  // Dev-only (no-op in prod): device/push tokens are device identifiers (PII).
  logger.debug(
    `[${DEVICE_REGISTRATION_TAG}] ${stage}`,
    metadata || {}
  );
}

function logDeviceRegistrationError(
  stage: string,
  error: unknown
) {
  // Message-only — never the raw error object (PostgrestError details/hint can echo row values).
  logger.error(
    `[${DEVICE_REGISTRATION_TAG}] ${stage}`,
    errorMessage(error)
  );
}

function createRegistrationRequestId() {
  return crypto.randomUUID();
}

function normalizePlayerId(
  value: string
) {
  return value
    .trim()
    .slice(0, PLAYER_ID_MAX_LENGTH);
}

export async function POST(req: Request) {
  const requestId =
    createRegistrationRequestId();

  const start =
    performance.now();

  try {
    logDeviceRegistrationStage(
      "device-registration-started",
      {
        requestId,
      }
    );

    // =========================================
    // AUTHORIZATION HEADER
    // =========================================

    const authHeader =
      req.headers.get(
        "authorization"
      );

    if (!authHeader) {
      return NextResponse.json(
        {
          error:
            "Missing authorization header",
        },
        {
          status: 401,
        }
      );
    }

    // =========================================
    // TOKEN EXTRACTION
    // =========================================

    const token = authHeader
      .replace("Bearer ", "")
      .trim();

    if (!token) {
      return NextResponse.json(
        {
          error: "Invalid token",
        },
        {
          status: 401,
        }
      );
    }

    // =========================================
    // SUPABASE ADMIN CLIENT
    // =========================================

    const supabase = createClient(
      process.env
        .NEXT_PUBLIC_SUPABASE_URL!,

      process.env
        .SUPABASE_SERVICE_ROLE_KEY!
    );

    // =========================================
    // VERIFY USER
    // =========================================

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(
      token
    );

    if (authError || !user) {
      logDeviceRegistrationError(
        "device-auth-error",
        {
          requestId,

          authError,
        }
      );

      return NextResponse.json(
        {
          error: "Unauthorized",
        },
        {
          status: 401,
        }
      );
    }

    logDeviceRegistrationStage(
      "device-authenticated",
      {
        requestId,

        userId: user.id,
      }
    );

    // =========================================
    // REQUEST BODY
    // =========================================

    const body = await req.json();

    const playerId =
      normalizePlayerId(
        body.playerId || ""
      );

    const memoryProfileId =
      body.memoryProfileId ||
      null;

    // =========================================
    // VALIDATION
    // =========================================

    if (!playerId) {
      return NextResponse.json(
        {
          error:
            "Missing playerId",
        },
        {
          status: 400,
        }
      );
    }

    logDeviceRegistrationStage(
      "device-registration-validated",
      {
        requestId,

        playerIdLength:
          playerId.length,

        hasMemoryProfile:
          Boolean(memoryProfileId),
      }
    );

    // =========================================
    // CROSS-USER PLAYER_ID GUARD
    // =========================================
    // This route uses the service-role client (bypasses RLS). A player_id is a
    // device-level push subscription id; an upsert onConflict("player_id") would
    // silently REASSIGN a player_id already owned by another account, hijacking
    // that device's notifications. Refuse cross-user reassignment. Same-user
    // re-registration (refresh last_seen / change profile) is unaffected.
    const {
      data: existingDevice,
    } = await supabase
      .from("device_registrations")
      .select("user_id")
      .eq("player_id", playerId)
      .maybeSingle();

    if (
      existingDevice &&
      existingDevice.user_id !== user.id
    ) {
      logDeviceRegistrationError(
        "device-player-id-conflict",
        {
          requestId,

          playerIdLength:
            playerId.length,
        }
      );

      return NextResponse.json(
        {
          error:
            "This device is already registered to another account.",
        },
        {
          status: 409,
        }
      );
    }

    // =========================================
    // UPSERT DEVICE
    // =========================================

    const upsertStart =
      performance.now();

    const {
      error: registrationError,
    } = await supabase
      .from(
        "device_registrations"
      )
      .upsert(
        {
          user_id: user.id,

          memory_profile_id:
            memoryProfileId,

          player_id: playerId,

          last_seen:
            new Date().toISOString(),
        },
        {
          onConflict:
            "player_id",

          ignoreDuplicates: false,
        }
      );

    const upsertDurationMs =
      Number(
        (
          performance.now() -
          upsertStart
        ).toFixed(2)
      );

    if (registrationError) {
      logDeviceRegistrationError(
        "device-registration-error",
        {
          requestId,

          registrationError,
        }
      );

      return NextResponse.json(
        {
          error:
            "Failed to register device",
        },
        {
          status: 500,
        }
      );
    }

    const totalDurationMs =
      Number(
        (
          performance.now() -
          start
        ).toFixed(2)
      );

    logDeviceRegistrationStage(
      "device-registration-completed",
      {
        requestId,

        userId: user.id,

        upsertDurationMs,

        totalDurationMs,
      }
    );

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    logDeviceRegistrationError(
      "device-registration-engine-error",
      error
    );

    return NextResponse.json(
      {
        error:
          "Internal server error",
      },
      {
        status: 500,
      }
    );
  }
}