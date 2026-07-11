import type { SupabaseClient } from "@supabase/supabase-js";

import { generateMemoryInsights } from "@/lib/ai-memory";
import { generateEmbedding } from "@/lib/embeddings";
import { buildRelationships } from "@/lib/build-relationships";
import { buildClusters } from "@/lib/build-clusters";
import { buildPeople } from "@/lib/build-people";
import { logger, errorMessage } from "@/lib/logger";

const TAG = "memory-enrichment";

function sanitizeStringValue(value: unknown, fallback: string) {
  if (typeof value !== "string") return fallback;
  const normalized = value.trim();
  return normalized || fallback;
}

export interface EnrichMemoryArgs {
  supabase: SupabaseClient;
  memoryId: string;
  userId: string;
  profileId: string | null;
  content: string;
  attachmentCount?: number;
  attachmentTypes?: string[];
}

/**
 * Deferred, NON-BLOCKING memory enrichment.
 *
 * This runs the AI cognition pipeline that USED to run synchronously inside
 * POST /api/memories/create — awaiting it before the DB insert was the primary cause
 * of Vercel function-duration timeouts that lost the memory entirely (~95% failure on
 * device). It now runs out-of-band (the client triggers POST /api/memories/[id]/enrich
 * after the create succeeds), so saving a memory is instant and insights "appear later".
 *
 * Properties:
 *  - Idempotent: safe to re-run (recomputes + overwrites the same columns).
 *  - Fault-isolated: every step is best-effort; a failed step is logged and skipped so
 *    the memory is never corrupted/blocked. Mirrors the create route's prior behaviour
 *    (insights → ai_* + embedding, then relationships/clusters/people).
 */
export async function enrichMemory({
  supabase,
  memoryId,
  userId,
  profileId,
  content,
  attachmentCount = 0,
  attachmentTypes = [],
}: EnrichMemoryArgs): Promise<{ ok: boolean; insights: boolean; embedding: boolean }> {
  logger.debug(`[${TAG}] ENRICHMENT_START`, {
    userId,
    profileId,
    memoryId,
    attachmentCount,
    attachmentTypes,
  });

  try {
    // 1. AI insights (best-effort)
    let ai: Awaited<ReturnType<typeof generateMemoryInsights>> | null = null;
    try {
      ai = await generateMemoryInsights(content);
    } catch (error) {
      logger.error(`[${TAG}] insights-error`, { memoryId, error: errorMessage(error) });
    }

    // 2. Embedding (best-effort)
    let embedding: number[] | null = null;
    try {
      embedding = await generateEmbedding(content);
    } catch (error) {
      logger.error(`[${TAG}] embedding-error`, { memoryId, error: errorMessage(error) });
    }

    // 3. Persist whatever we computed (only the columns we actually have).
    const update: Record<string, unknown> = {};
    if (ai) {
      const aiTitle = sanitizeStringValue(ai.title, "");
      if (aiTitle) {
        // Preserve prior behaviour: the displayed title becomes the AI-polished title.
        update.title = aiTitle;
        update.ai_title = aiTitle;
      }
      update.ai_summary = sanitizeStringValue(ai.summary, "");
      update.ai_tags = Array.isArray(ai.tags)
        ? ai.tags.filter(
            (tag: unknown): tag is string =>
              typeof tag === "string" && Boolean(tag.trim()),
          )
        : [];
      update.ai_category = sanitizeStringValue(ai.category, "General");
      update.ai_mood = sanitizeStringValue(ai.mood, "Neutral");
      update.ai_importance = sanitizeStringValue(ai.importance, "Medium");
      update.ai_confidence =
        typeof ai.confidence === "number"
          ? Math.round(ai.confidence <= 1 ? ai.confidence * 100 : ai.confidence)
          : 85;
      update.ai_sentiment = sanitizeStringValue(ai.sentiment, "Neutral");
      update.ai_emotional_weight = sanitizeStringValue(ai.emotionalWeight, "Light");
    }
    if (Array.isArray(embedding)) {
      update.embedding = embedding;
    }

    if (Object.keys(update).length > 0) {
      const { error } = await supabase
        .from("memories")
        .update(update)
        .eq("id", memoryId)
        .eq("user_id", userId);
      if (error) {
        logger.error(`[${TAG}] update-error`, { memoryId, error: errorMessage(error) });
      }
    }

    // 4. Cognition — relationships / clusters / people. Independent + best-effort.
    await Promise.allSettled([
      buildRelationships(memoryId).catch((error) =>
        logger.error(`[${TAG}] relationship-error`, { memoryId, error: errorMessage(error) }),
      ),
      buildClusters(memoryId).catch((error) =>
        logger.error(`[${TAG}] cluster-error`, { memoryId, error: errorMessage(error) }),
      ),
      buildPeople(memoryId, content, userId, profileId, ai?.people ?? []).catch(
        (error) => logger.error(`[${TAG}] people-error`, { memoryId, error: errorMessage(error) }),
      ),
    ]);

    logger.debug(`[${TAG}] ENRICHMENT_COMPLETE`, {
      memoryId,
      insights: Boolean(ai),
      embedding: Array.isArray(embedding),
    });
    return { ok: true, insights: Boolean(ai), embedding: Array.isArray(embedding) };
  } catch (error) {
    logger.error(`[${TAG}] ENRICHMENT_FAILURE`, { memoryId, error: errorMessage(error) });
    return { ok: false, insights: false, embedding: false };
  }
}
