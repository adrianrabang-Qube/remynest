import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { resolveActiveProfileId } from "@/lib/context-resolver";
import {
  MemoryAttachmentValidationError,
} from "@/lib/memory-media";

import {
  buildMemoryMediaPayload,
} from "@/lib/memory-media-pipeline";

import { signMemory } from "@/lib/memory-media-signing";
import { enforceUploadQuota } from "@/lib/storage/upload-guard";
import { validateAndResolveMemoryDate } from "@/lib/memories/memory-date";

const MEMORY_PIPELINE_TAG =
  "memory-cognition-pipeline";

const MEMORY_CONTENT_MAX_LENGTH =
  10_000;

function logPipelineStage(
  stage: string,
  metadata?: unknown
) {
  console.info(
    `[${MEMORY_PIPELINE_TAG}] ${stage}`,
    metadata || {}
  );
}

function logPipelineError(
  stage: string,
  error: unknown
) {
  console.error(
    `[${MEMORY_PIPELINE_TAG}] ${stage}`,
    error
  );
}

function normalizeMemoryContent(
  content: string
) {
  return content.trim();
}

function validateMemoryContent(
  content: string
) {
  if (!content) {
    return "Content required";
  }

  if (
    content.length >
    MEMORY_CONTENT_MAX_LENGTH
  ) {
    return `Memory content exceeds ${MEMORY_CONTENT_MAX_LENGTH} characters`;
  }

  return null;
}

function sanitizeStringValue(
  value: unknown,
  fallback: string
) {
  if (
    typeof value !== "string"
  ) {
    return fallback;
  }

  const normalized =
    value.trim();

  return (
    normalized || fallback
  );
}

function createPipelineRequestId() {
  return crypto.randomUUID();
}

function createPipelineMetrics() {
  return {
    aiDurationMs: 0,
    embeddingDurationMs: 0,
    relationshipDurationMs: 0,
    clusterDurationMs: 0,
  };
}

function logPipelineMetrics(
  metrics: ReturnType<
    typeof createPipelineMetrics
  >
) {
  logPipelineStage(
    "pipeline-metrics",
    metrics
  );
}

export async function POST(req: Request) {
  try {

    const supabase =
      await createClient();

    // =====================================
    // AUTH
    // =====================================

    const {
      data: { user },
    } = await supabase.auth.getUser();

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

    console.info("[create-memory] CREATE_MEMORY_START", {
      userId: user.id,
    });

    // =====================================
    // ACTIVE PROFILE
    // =====================================

    const activeProfileId =
      await resolveActiveProfileId();

    logPipelineStage(
      "active-context-resolved",
      {
        activeProfileId,
      }
    );

    // My Nest personal workspace is supported for MVP.
    // In care workspace, activeProfileId is preserved.
    // In personal workspace, memory_profile_id is intentionally null.

    // =====================================
    // REQUEST BODY
    // =====================================

    const contentType =
      req.headers.get(
        "content-type"
      ) || "";

    let body: Record<
      string,
      unknown
    >;

    if (
      contentType.includes(
        "application/json"
      )
    ) {
      body = await req.json();
    } else {
      const formData =
        await req.formData();

      body = {
        title:
          formData.get(
            "title"
          ),

        content:
          formData.get(
            "content"
          ),

        profileId:
          formData.get(
            "profileId"
          ),

        memoryDate:
          formData.get(
            "memoryDate"
          ),

        memoryDatePrecision:
          formData.get(
            "memoryDatePrecision"
          ),

        uploadedFiles:
          formData.getAll(
            "uploadedFiles"
          ),
      };
    }

    logPipelineStage(
      "request-body-received"
    );

    const {
      title,
      content,
    } = body;

    // Pre-upload quota enforcement — validate the WHOLE batch BEFORE any storage
    // write. Reuses the storage ledger; fails closed; 0-byte batches pass through.
    const uploadFiles = (
      Array.isArray(body.uploadedFiles) ? body.uploadedFiles : []
    ).filter((f): f is File => f instanceof File);
    const quota = await enforceUploadQuota(user.id, uploadFiles);
    if (!quota.allowed) {
      return NextResponse.json(
        {
          error: quota.reason ?? "Storage limit exceeded",
          quota,
        },
        { status: 413 }
      );
    }

    console.info("[create-memory] MEDIA_UPLOAD_START", {
      userId: user.id,
      profileId: activeProfileId ?? null,
      attachmentCount: uploadFiles.length,
      attachmentTypes: uploadFiles.map((f) => f.type || "unknown"),
    });

    const memoryMediaPayload =
      await buildMemoryMediaPayload({
        body,
        userId: user.id,
      });

    const normalizedAttachments =
      memoryMediaPayload.attachments;

    const normalizedCoverImageUrl =
      memoryMediaPayload.coverImageUrl;

    console.info("[create-memory] MEDIA_UPLOAD_SUCCESS", {
      userId: user.id,
      profileId: activeProfileId ?? null,
      attachmentCount: normalizedAttachments.length,
      attachmentTypes: normalizedAttachments.map((a) => a.type ?? "unknown"),
    });

    const normalizedContent =
      normalizeMemoryContent(
  typeof content === "string"
    ? content
    : ""
);

    const contentValidationError =
      validateMemoryContent(
        normalizedContent
      );

    if (
      contentValidationError
    ) {
      return NextResponse.json(
        {
          error:
            contentValidationError,
        },
        {
          status: 400,
        }
      );
    }

    // =====================================
    // HISTORICAL MEMORY DATE (optional)
    // =====================================

    const memoryDateResult =
      validateAndResolveMemoryDate(
        body.memoryDate,
        body.memoryDatePrecision
      );

    if (!memoryDateResult.ok) {
      return NextResponse.json(
        {
          error: memoryDateResult.error,
        },
        {
          status: 400,
        }
      );
    }

    const pipelineStart =
      performance.now();

    const pipelineRequestId =
      createPipelineRequestId();

    const pipelineMetrics =
      createPipelineMetrics();

    logPipelineStage(
      "memory-pipeline-started",
      {
        requestId:
          pipelineRequestId,

        userId: user.id,

        profileId:
          activeProfileId,

        contentLength:
          normalizedContent.length,
      }
    );

    // =====================================
    // AI ENRICHMENT — DEFERRED (non-blocking)
    //   AI insights + embedding NO LONGER run on the create request. Awaiting them
    //   here (BEFORE the insert) was the primary cause of Vercel function-duration
    //   timeouts that lost the memory entirely. The row is now persisted immediately
    //   with the user's title + neutral defaults; the client triggers
    //   POST /api/memories/[id]/enrich, which fills ai_* + embedding +
    //   people/clusters/relationships via lib/memory-enrichment.ts.
    // =====================================

    const aiTitle = sanitizeStringValue(
      title,
      "Untitled Memory"
    );
    const aiSummary = "";
    const aiTags: string[] = [];
    const aiCategory = "General";
    const aiMood = "Neutral";
    const aiImportance = "Medium";
    const aiConfidence = 85;
    const aiSentiment = "Neutral";
    const aiEmotionalWeight = "Light";
    const embedding: number[] | null = null;

    // =====================================
    // INSERT MEMORY
    // =====================================

    logPipelineStage(
      "memory-persist-started",
      {
        requestId:
          pipelineRequestId,
      }
    );

    const memoryInsertPayload = {
      user_id:
        user.id,

      memory_profile_id:
        activeProfileId ?? null,

      title:
        aiTitle,

      content:
        normalizedContent,

        attachments:
  normalizedAttachments,

cover_image_url:
  normalizedCoverImageUrl,

      ai_title:
        aiTitle,

      ai_summary:
        aiSummary,

      ai_tags:
        aiTags,

      ai_category:
        aiCategory,

      ai_mood:
        aiMood,

      ai_importance:
        aiImportance,

      ai_confidence:
        aiConfidence,

      ai_sentiment:
        aiSentiment,

      ai_emotional_weight:
        aiEmotionalWeight,

      embedding:
        Array.isArray(
          embedding
        )
          ? embedding
          : null,
    };

    logPipelineStage(
      "memory-insert-payload-built",
      {
        requestId:
          pipelineRequestId,

        hasEmbedding:
          Boolean(embedding),

        tagCount:
          aiTags.length,

        category:
          aiCategory,
      }
    );

    console.info("[create-memory] MEMORY_INSERT_START", {
      userId: user.id,
      profileId: activeProfileId ?? null,
      attachmentCount: normalizedAttachments.length,
      attachmentTypes: normalizedAttachments.map((a) => a.type ?? "unknown"),
    });

    const {
      data,
      error,
    } = await supabase
      .from("memories")
      .insert([
        memoryInsertPayload,
      ])
      .select()
      .single();

    if (error) {

      logPipelineError(
        "memory-persist-error",
        {
          requestId:
            pipelineRequestId,

          error,
        }
      );

      return NextResponse.json(
        {
          error:
            "Failed to create memory",
        },
        {
          status: 500,
        }
      );
    }

    logPipelineStage(
      "memory-persisted",
      {
        requestId:
          pipelineRequestId,

        memoryId:
          data.id,
      }
    );

    console.info("[create-memory] MEMORY_INSERT_SUCCESS", {
      userId: user.id,
      profileId: activeProfileId ?? null,
      memoryId: data.id,
    });

    // =====================================
    // HISTORICAL DATE — best-effort, deploy-safe
    //   The primary insert already succeeded. If the memory_date columns are
    //   not yet migrated this no-ops (PGRST204) and the memory simply keeps its
    //   creation date — memory creation is never blocked.
    // =====================================

    if (memoryDateResult.memoryDate) {
      const { error: memoryDateError } =
        await supabase
          .from("memories")
          .update({
            memory_date:
              memoryDateResult.memoryDate,
            memory_date_precision:
              memoryDateResult.precision,
          })
          .eq("id", data.id)
          .eq("user_id", user.id);

      if (memoryDateError) {
        logPipelineStage(
          "memory-date-skipped",
          {
            requestId:
              pipelineRequestId,
            code: memoryDateError.code,
          }
        );
      }
    }

    // =====================================
    // ENRICHMENT IS DEFERRED
    //   relationships / clusters / people are built by the enrichment job
    //   (POST /api/memories/[id]/enrich), NOT on the create request, so the memory is
    //   returned to the client immediately. See lib/memory-enrichment.ts.
    // =====================================

    const pipelineDuration =
      performance.now() -
      pipelineStart;

    logPipelineStage(
      "memory-pipeline-completed",
      {
        requestId:
          pipelineRequestId,

        memoryId: data.id,

        durationMs:
          pipelineDuration.toFixed(2),
      }
    );

    logPipelineMetrics(
      pipelineMetrics
    );

    const totalPipelineDurationMs =
      Number(
        (
          performance.now() -
          pipelineStart
        ).toFixed(2)
      );

    logPipelineStage(
      "pipeline-performance-summary",
      {
        requestId:
          pipelineRequestId,

        totalPipelineDurationMs,

        aiDurationMs:
          pipelineMetrics.aiDurationMs,

        embeddingDurationMs:
          pipelineMetrics.embeddingDurationMs,

        relationshipDurationMs:
          pipelineMetrics.relationshipDurationMs,

        clusterDurationMs:
          pipelineMetrics.clusterDurationMs,
      }
    );

    return NextResponse.json(
      await signMemory(data)
    );

  } catch (error) {
    if (error instanceof MemoryAttachmentValidationError) {
      return NextResponse.json(
        {
          error: error.message,
        },
        {
          status: 400,
        }
      );
    }

    logPipelineError(
      "memory-create-error",
      {
        error,
      }
    );

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