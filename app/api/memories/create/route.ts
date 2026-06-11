import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateMemoryInsights } from "@/lib/ai-memory";
import { generateEmbedding } from "@/lib/embeddings";
import { resolveActiveProfileId } from "@/lib/context-resolver";
import { buildRelationships } from "@/lib/build-relationships";
import { buildClusters } from "@/lib/build-clusters";
import {
  MemoryAttachmentValidationError,
} from "@/lib/memory-media";

import {
  buildMemoryMediaPayload,
} from "@/lib/memory-media-pipeline";

import { signMemory } from "@/lib/memory-media-signing";
import { validateAndResolveMemoryDate } from "@/lib/memories/memory-date";

const MEMORY_PIPELINE_TAG =
  "memory-cognition-pipeline";

const MEMORY_CONTENT_MAX_LENGTH =
  10_000;

const MEMORY_PIPELINE_TIMEOUT_MS =
  30_000;

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

function createPipelineAbortSignal() {
  return AbortSignal.timeout(
    MEMORY_PIPELINE_TIMEOUT_MS
  );
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

async function safelyExecutePipelineTask<T>(
  stage: string,
  task: (
    signal: AbortSignal
  ) => Promise<T>
) {
  try {
    const signal =
      createPipelineAbortSignal();

    return await task(signal);
  } catch (error) {
    logPipelineError(
      stage,
      error
    );

    return null;
  }
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

    const memoryMediaPayload =
      await buildMemoryMediaPayload({
        body,
        userId: user.id,
      });

    const normalizedAttachments =
      memoryMediaPayload.attachments;

    const normalizedCoverImageUrl =
      memoryMediaPayload.coverImageUrl;

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
    // AI MEMORY ANALYSIS
    // =====================================

    let aiTitle =
      sanitizeStringValue(
        title,
        "Untitled Memory"
      );

    let aiSummary = "";

    let aiTags: string[] =
      [];

    let aiCategory =
      "General";

    let aiMood =
      "Neutral";

    let aiImportance =
      "Medium";

    let aiConfidence =
      85;

    let aiSentiment =
      "Neutral";

    let aiEmotionalWeight =
      "Light";

    const aiStart =
      performance.now();

    const ai =
      await safelyExecutePipelineTask(
        "ai-analysis-error",
        async () => {
          return generateMemoryInsights(
            normalizedContent
          );
        }
      );

    if (ai) {
      aiTitle =
        sanitizeStringValue(
          ai.title,
          aiTitle
        );

      aiSummary =
        sanitizeStringValue(
          ai.summary,
          ""
        );

      aiTags = Array.isArray(
        ai.tags
      )
        ? ai.tags.filter(
            (
              tag: unknown
            ): tag is string =>
              typeof tag ===
                "string" &&
              Boolean(
                tag.trim()
              )
          )
        : [];

      aiCategory =
        sanitizeStringValue(
          ai.category,
          "General"
        );

      aiMood =
        sanitizeStringValue(
          ai.mood,
          "Neutral"
        );

      aiImportance =
        sanitizeStringValue(
          ai.importance,
          "Medium"
        );

      aiConfidence =
  typeof ai.confidence ===
    "number"
    ? Math.round(
        ai.confidence <= 1
          ? ai.confidence * 100
          : ai.confidence
      )
    : 85;

      aiSentiment =
        sanitizeStringValue(
          ai.sentiment,
          "Neutral"
        );

      aiEmotionalWeight =
        sanitizeStringValue(
          ai.emotionalWeight,
          "Light"
        );

      pipelineMetrics.aiDurationMs =
        Number(
          (
            performance.now() -
            aiStart
          ).toFixed(2)
        );

      logPipelineStage(
        "ai-analysis-completed",
        {
          durationMs:
            pipelineMetrics.aiDurationMs,
        }
      );
    }

    // =====================================
    // EMBEDDING
    // =====================================

    let embedding:
      | number[]
      | null = null;

    logPipelineStage(
      "embedding-generation-started"
    );

    const embeddingStart =
      performance.now();

    embedding =
      await safelyExecutePipelineTask(
        "embedding-generation-error",
        async () => {
          return generateEmbedding(
            normalizedContent
          );
        }
      );

    if (embedding) {
      pipelineMetrics.embeddingDurationMs =
        Number(
          (
            performance.now() -
            embeddingStart
          ).toFixed(2)
        );

      logPipelineStage(
        "embedding-completed",
        {
          durationMs:
            pipelineMetrics.embeddingDurationMs,
        }
      );
    }

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
    // ASYNC COGNITION TASKS
    // =====================================

    const cognitionTasks: Promise<void>[] = [];

    // =====================================
    // BUILD RELATIONSHIPS
    // =====================================

    const relationshipStart =
      performance.now();

    const relationshipPromise =
      buildRelationships(
        data.id
      )
        .then(
          (
            relationshipResult
          ) => {
            pipelineMetrics.relationshipDurationMs =
              Number(
                (
                  performance.now() -
                  relationshipStart
                ).toFixed(2)
              );

            logPipelineStage(
              "relationships-built",
              {
                relationshipResult,
                durationMs:
                  pipelineMetrics.relationshipDurationMs,
              }
            );
          }
        )
        .catch(
          (
            relationshipError
          ) => {
            logPipelineError(
              "relationship-error",
              relationshipError
            );
          }
        );

    cognitionTasks.push(
      relationshipPromise
    );

    // =====================================
    // BUILD CLUSTERS
    // =====================================

    const clusterStart =
      performance.now();

    const clusterPromise =
      buildClusters(
        data.id
      )
        .then(() => {
          pipelineMetrics.clusterDurationMs =
            Number(
              (
                performance.now() -
                clusterStart
              ).toFixed(2)
            );

          logPipelineStage(
            "clusters-built",
            {
              durationMs:
                pipelineMetrics.clusterDurationMs,
            }
          );
        })
        .catch(
          (clusterError) => {
            logPipelineError(
              "cluster-error",
              clusterError
            );
          }
        );

    cognitionTasks.push(
      clusterPromise
    );

    await Promise.allSettled(
      cognitionTasks
    );

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