import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateMemoryInsights } from "@/lib/ai-memory";
import { generateEmbedding } from "@/lib/embeddings";
import { getActiveProfile } from "@/lib/active-profile";
import { buildRelationships } from "@/lib/build-relationships";
import { buildClusters } from "@/lib/build-clusters";

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
      await getActiveProfile();

    if (!activeProfileId) {
      return NextResponse.json(
        {
          error:
            "No active profile selected",
        },
        {
          status: 400,
        }
      );
    }

    // =====================================
    // REQUEST BODY
    // =====================================

    const body =
      await req.json();

    logPipelineStage(
      "request-body-received"
    );

    const {
      title,
      content,
    } = body;

    const normalizedContent =
      normalizeMemoryContent(
        content || ""
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
      title || "Untitled Memory";

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
        ai.title ||
        title ||
        "Untitled Memory";

      aiSummary =
        ai.summary || "";

      aiTags =
        ai.tags || [];

      aiCategory =
        ai.category ||
        "General";

      aiMood =
        ai.mood ||
        "Neutral";

      aiImportance =
        ai.importance ||
        "Medium";

      aiConfidence =
        ai.confidence || 85;

      aiSentiment =
        ai.sentiment ||
        "Neutral";

      aiEmotionalWeight =
        ai.emotionalWeight ||
        "Light";

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

    const {
      data,
      error,
    } = await supabase
      .from("memories")
      .insert([
        {
          user_id:
            user.id,

          memory_profile_id:
            activeProfileId,

          title:
            aiTitle,

          content:
            normalizedContent,

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

          embedding,
        },
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
      data
    );

  } catch (error) {

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