import { cache } from "react";

import { createClient } from "@/lib/supabase/server";

import type {
  InsightsTelemetryPayload,
  TelemetryCacheConfiguration,
  TelemetryGovernance,
  TelemetryGovernanceSnapshot,
  TelemetryHealthSnapshot,
  TelemetryHealthStatus,
  TelemetryLimitWarnings,
  TelemetryObservabilitySnapshot,
  TelemetryPayloadMetadata,
  TelemetryQueryResponses,
  TelemetrySnapshot,
  TelemetryFreshnessState,
  TelemetryLifecycleMetadata,
  TelemetryLifecycleSnapshot,
} from "@/lib/types/telemetry";

export const INSIGHTS_QUERY_LIMIT =
  500;

export const INSIGHTS_CACHE_TAG =
  "insights-telemetry";

export const TELEMETRY_CACHE_WINDOW =
  "60s";

export const TELEMETRY_STALE_AFTER_MS =
  60_000;

export const TELEMETRY_INVALIDATION_WINDOW_MS =
  300_000;

export const TELEMETRY_REFRESH_WINDOW_MS =
  120_000;

export const TELEMETRY_SYNC_WINDOW_MS =
  180_000;

export const TELEMETRY_WORKER_WINDOW_MS =
  240_000;

export const TELEMETRY_QUEUE_WINDOW_MS =
  300_000;

export const TELEMETRY_CACHE_CONFIGURATION: TelemetryCacheConfiguration = {
  cacheWindow:
    TELEMETRY_CACHE_WINDOW,

  cacheTag:
    INSIGHTS_CACHE_TAG,
};

export const TELEMETRY_DATASET_LIMIT_WARNING =
  450;

export const TELEMETRY_HEALTH: Record<
  Uppercase<TelemetryHealthStatus>,
  TelemetryHealthStatus
> = {
  HEALTHY: "healthy",
  WARNING: "warning",
};

export const TELEMETRY_GOVERNANCE: TelemetryGovernance = {
  cacheWindow:
    TELEMETRY_CACHE_WINDOW,

  queryLimit:
    INSIGHTS_QUERY_LIMIT,

  warningThreshold:
    TELEMETRY_DATASET_LIMIT_WARNING,
};

Object.freeze(
  TELEMETRY_GOVERNANCE
);

Object.freeze(
  TELEMETRY_HEALTH
);

export function safeArrayLength(
  value: unknown[] | null
) {
  return value?.length || 0;
}

export function reachedTelemetryLimit(
  value: unknown[] | null
) {
  return (
    safeArrayLength(value) >=
    TELEMETRY_DATASET_LIMIT_WARNING
  );
}

export function getTelemetryHealth(
  value: unknown[] | null
) {
  return reachedTelemetryLimit(value)
    ? TELEMETRY_HEALTH.WARNING
    : TELEMETRY_HEALTH.HEALTHY;
}

export function normalizeTelemetry<T>(
  value: T[] | null
): T[] {
  return [
    ...(value || []),
  ].reverse();
}

export function createImmutablePayload<T>(
  payload: T
) {
  return Object.freeze(payload);
}

export function createTelemetrySnapshot(
  memories: unknown[] | null,
  reminders: unknown[] | null
): TelemetrySnapshot
{
  return {
    memories:
      safeArrayLength(memories),

    reminders:
      safeArrayLength(reminders),
  };
}

export function createTelemetryHealthSnapshot(
  memories: unknown[] | null,
  reminders: unknown[] | null
): TelemetryHealthSnapshot
{
  return {
    memories:
      getTelemetryHealth(memories),

    reminders:
      getTelemetryHealth(reminders),
  };
}

export function createTelemetryLimitWarnings(
  memories: unknown[] | null,
  reminders: unknown[] | null
): TelemetryLimitWarnings
{
  return {
    memories:
      reachedTelemetryLimit(memories),

    reminders:
      reachedTelemetryLimit(reminders),
  };
}

export function hasTelemetryWarnings(
  warnings: TelemetryLimitWarnings
) {
  return (
    warnings.memories ||
    warnings.reminders
  );
}

export function createTelemetryPayload<
  TMemories,
  TReminders
>(
  memories: TMemories[],
  reminders: TReminders[]
): InsightsTelemetryPayload<
  TMemories,
  TReminders
> {
  return {
    memories,
    reminders,
  } as const;
}

export function createTelemetryPayloadMetadata(): TelemetryPayloadMetadata {
  return {
    generatedAt:
      new Date().toISOString(),

    cacheWindow:
      TELEMETRY_CACHE_WINDOW,
  } as const;
}

export function logTelemetryWarnings(
  warnings: TelemetryLimitWarnings
) {
  console.warn(
    `[${INSIGHTS_CACHE_TAG}] telemetry dataset approaching query limit`,
    warnings
  );
}

export function logTelemetrySnapshot(
  snapshot: unknown
) {
  console.info(
    `[${INSIGHTS_CACHE_TAG}] telemetry snapshot`,
    snapshot
  );
}

export function createTelemetryObservabilitySnapshot(
  snapshot: TelemetrySnapshot,
  health: TelemetryHealthSnapshot
): TelemetryObservabilitySnapshot {
  return {
    snapshot,
    health,
  };
}

export function createTelemetryGovernanceSnapshot(
  snapshot: TelemetrySnapshot,
  health: TelemetryHealthSnapshot
): TelemetryGovernanceSnapshot
{
  return {
    governance:
      TELEMETRY_GOVERNANCE,

    snapshot,

    health,
  };
}

export function stabilizeTelemetryPayload<T>(
  payload: T
) {
  return createImmutablePayload(
    payload
  );
}

export function createTelemetryCacheKey(
  userId: string
) {
  return `${INSIGHTS_CACHE_TAG}:${userId}`;
}

export function createTelemetryFreshnessState(
  generatedAt: string,
  staleAfterMs =
    TELEMETRY_STALE_AFTER_MS
): TelemetryFreshnessState {
  const ageMs =
    Date.now() -
    new Date(generatedAt).getTime();

  return {
    isStale:
      ageMs > staleAfterMs,

    ageMs,
  };
}

export function createTelemetryLifecycleMetadata(
  cacheKey?: string
): TelemetryLifecycleMetadata {
  return {
    generatedAt:
      new Date().toISOString(),

    cacheWindow:
      TELEMETRY_CACHE_WINDOW,

    cacheKey,
  };
}

export function createTelemetryLifecycleSnapshot(
  metadata: TelemetryLifecycleMetadata
): TelemetryLifecycleSnapshot {
  return {
    metadata,

    freshness:
      createTelemetryFreshnessState(
        metadata.generatedAt
      ),
  };
}

export function logTelemetryFreshness(
  freshness: TelemetryFreshnessState
) {
  if (freshness.isStale) {
    console.warn(
      `[${INSIGHTS_CACHE_TAG}] stale telemetry detected`,
      freshness
    );

    return;
  }

  console.info(
    `[${INSIGHTS_CACHE_TAG}] telemetry freshness healthy`,
    freshness
  );
}

export function shouldInvalidateTelemetry(
  freshness: TelemetryFreshnessState,
  invalidationWindowMs =
    TELEMETRY_INVALIDATION_WINDOW_MS
) {
  return (
    freshness.ageMs >=
    invalidationWindowMs
  );
}

export function logTelemetryInvalidation(
  freshness: TelemetryFreshnessState
) {
  if (
    !shouldInvalidateTelemetry(
      freshness
    )
  ) {
    return;
  }

  console.warn(
    `[${INSIGHTS_CACHE_TAG}] telemetry invalidation recommended`,
    freshness
  );
}

export function shouldRefreshTelemetry(
  freshness: TelemetryFreshnessState,
  refreshWindowMs =
    TELEMETRY_REFRESH_WINDOW_MS
) {
  return (
    freshness.ageMs >=
    refreshWindowMs
  );
}

export function logTelemetryRefreshRecommendation(
  freshness: TelemetryFreshnessState
) {
  if (
    !shouldRefreshTelemetry(
      freshness
    )
  ) {
    return;
  }

  console.info(
    `[${INSIGHTS_CACHE_TAG}] telemetry refresh recommended`,
    freshness
  );
}

export function shouldSynchronizeTelemetry(
  freshness: TelemetryFreshnessState,
  synchronizationWindowMs =
    TELEMETRY_SYNC_WINDOW_MS
) {
  return (
    freshness.ageMs >=
    synchronizationWindowMs
  );
}

export function logTelemetrySynchronization(
  freshness: TelemetryFreshnessState
) {
  if (
    !shouldSynchronizeTelemetry(
      freshness
    )
  ) {
    return;
  }

  console.info(
    `[${INSIGHTS_CACHE_TAG}] telemetry synchronization recommended`,
    freshness
  );
}

export function shouldScheduleTelemetryWorker(
  freshness: TelemetryFreshnessState,
  workerWindowMs =
    TELEMETRY_WORKER_WINDOW_MS
) {
  return (
    freshness.ageMs >=
    workerWindowMs
  );
}

export function logTelemetryWorkerRecommendation(
  freshness: TelemetryFreshnessState
) {
  if (
    !shouldScheduleTelemetryWorker(
      freshness
    )
  ) {
    return;
  }

  console.info(
    `[${INSIGHTS_CACHE_TAG}] telemetry worker scheduling recommended`,
    freshness
  );
}

export function shouldQueueTelemetryRefresh(
  freshness: TelemetryFreshnessState,
  queueWindowMs =
    TELEMETRY_QUEUE_WINDOW_MS
) {
  return (
    freshness.ageMs >=
    queueWindowMs
  );
}

export function logTelemetryQueueRecommendation(
  freshness: TelemetryFreshnessState
) {
  if (
    !shouldQueueTelemetryRefresh(
      freshness
    )
  ) {
    return;
  }

  console.info(
    `[${INSIGHTS_CACHE_TAG}] telemetry queue refresh recommended`,
    freshness
  );
}

export function runTelemetryLifecycleGovernance(
  freshness: TelemetryFreshnessState
) {
  logTelemetryFreshness(
    freshness
  );

  logTelemetryInvalidation(
    freshness
  );

  logTelemetryRefreshRecommendation(
    freshness
  );

  logTelemetrySynchronization(
    freshness
  );

  logTelemetryWorkerRecommendation(
    freshness
  );

  logTelemetryQueueRecommendation(
    freshness
  );
}

export const fetchInsightsTelemetry =
  cache(
    async function fetchInsightsTelemetry(
      supabase: Awaited<
        ReturnType<
          typeof createClient
        >
      >,
      userId: string
    ) {
      const telemetryStart =
        performance.now();

      const telemetryCacheKey =
        createTelemetryCacheKey(
          userId
        );

      const telemetryLifecycleMetadata =
        createTelemetryLifecycleMetadata(
          telemetryCacheKey
        );

      const telemetryLifecycleSnapshot =
        createTelemetryLifecycleSnapshot(
          telemetryLifecycleMetadata
        );

      const [
        memoriesResponse,
        remindersResponse,
      ] = await Promise.all([
        supabase
          .from("memories")
          .select(`
            id,
            ai_mood,
            ai_category,
            created_at
          `)
          .eq("user_id", userId)
          .order("created_at", {
            ascending: false,
          })
          .limit(
            INSIGHTS_QUERY_LIMIT
          ),

        supabase
          .from("reminders")
          .select(`
            id,
            completed,
            created_at
          `)
          .eq("user_id", userId)
          .order("created_at", {
            ascending: false,
          })
          .limit(
            INSIGHTS_QUERY_LIMIT
          ),
      ]);

      const telemetryDuration =
        performance.now() -
        telemetryStart;

      console.info(
        `[${INSIGHTS_CACHE_TAG}] telemetry fetched in ${telemetryDuration.toFixed(2)}ms | cache window ${TELEMETRY_CACHE_WINDOW} | cache key ${telemetryCacheKey}`
      );

      console.info(
        `[${INSIGHTS_CACHE_TAG}] telemetry lifecycle`,
        telemetryLifecycleSnapshot
      );

      runTelemetryLifecycleGovernance(
        telemetryLifecycleSnapshot.freshness
      );

      return {
        memoriesResponse,
        remindersResponse,
      } satisfies TelemetryQueryResponses<
        typeof memoriesResponse,
        typeof remindersResponse
      >;
    }
  );