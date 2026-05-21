import { openai } from "@/lib/openai";

const EMBEDDING_MODEL =
  "text-embedding-3-small";

const EMBEDDING_TAG =
  "memory-embedding-engine";

const EMBEDDING_TIMEOUT_MS =
  15_000;

const EMBEDDING_MAX_INPUT_LENGTH =
  8_000;

const EMBEDDING_CACHE_TTL_MS =
  5 * 60 * 1000;

const EMBEDDING_CACHE_MAX_SIZE =
  1_000;

const EMBEDDING_MIN_INPUT_LENGTH =
  3;

const embeddingCache = new Map<
  string,
  {
    embedding: number[];
    createdAt: number;
  }
>();

const pendingEmbeddingRequests =
  new Map<
    string,
    Promise<number[]>
  >();

function logEmbeddingStage(
  stage: string,
  metadata?: unknown
) {
  console.info(
    `[${EMBEDDING_TAG}] ${stage}`,
    metadata || {}
  );
}

function logEmbeddingError(
  stage: string,
  error: unknown
) {
  console.error(
    `[${EMBEDDING_TAG}] ${stage}`,
    error
  );
}

function normalizeEmbeddingInput(
  input: string
) {
  return input
    .replace(/\s+/g, " ")
    .trim()
    .slice(
      0,
      EMBEDDING_MAX_INPUT_LENGTH
    );
}

function shouldSkipEmbeddingGeneration(
  input: string
) {
  return (
    !input ||
    input.length <
      EMBEDDING_MIN_INPUT_LENGTH
  );
}

function createEmbeddingRequestId() {
  return crypto.randomUUID();
}

function createEmbeddingAbortSignal() {
  return AbortSignal.timeout(
    EMBEDDING_TIMEOUT_MS
  );
}

function validateEmbedding(
  embedding: unknown
): embedding is number[] {
  return (
    Array.isArray(embedding) &&
    embedding.every(
      (value) =>
        typeof value === "number"
    )
  );
}

function createEmptyEmbedding() {
  return [] as number[];
}

function createEmbeddingCacheKey(
  input: string
) {
  return `${EMBEDDING_MODEL}:${input}`;
}

function getCachedEmbedding(
  cacheKey: string
) {
  const cached =
    embeddingCache.get(cacheKey);

  if (!cached) {
    return null;
  }

  const isExpired =
    Date.now() -
      cached.createdAt >
    EMBEDDING_CACHE_TTL_MS;

  if (isExpired) {
    embeddingCache.delete(
      cacheKey
    );

    return null;
  }

  return cached.embedding;
}

function evictOldestEmbeddingCacheEntry() {
  const oldestKey =
    embeddingCache.keys().next()
      .value;

  if (!oldestKey) {
    return;
  }

  embeddingCache.delete(
    oldestKey
  );

  logEmbeddingStage(
    "embedding-cache-evicted",
    {
      cacheKey: oldestKey,
    }
  );
}

function cacheEmbedding(
  cacheKey: string,
  embedding: number[]
) {
  if (
    embeddingCache.size >=
    EMBEDDING_CACHE_MAX_SIZE
  ) {
    evictOldestEmbeddingCacheEntry();
  }

  embeddingCache.set(cacheKey, {
    embedding,

    createdAt: Date.now(),
  });

  logEmbeddingStage(
    "embedding-cached",
    {
      cacheKey,

      cacheSize:
        embeddingCache.size,
    }
  );
}

function getPendingEmbeddingRequest(
  cacheKey: string
) {
  return pendingEmbeddingRequests.get(
    cacheKey
  );
}

function setPendingEmbeddingRequest(
  cacheKey: string,
  request: Promise<number[]>
) {
  pendingEmbeddingRequests.set(
    cacheKey,
    request
  );
}

function clearPendingEmbeddingRequest(
  cacheKey: string
) {
  pendingEmbeddingRequests.delete(
    cacheKey
  );
}

function getEmbeddingCacheMetrics() {
  return {
    cacheSize:
      embeddingCache.size,

    pendingRequests:
      pendingEmbeddingRequests.size,

    cacheTtlMs:
      EMBEDDING_CACHE_TTL_MS,

    cacheMaxSize:
      EMBEDDING_CACHE_MAX_SIZE,
  };
}

const embeddingLifecycleMetrics = {
  cacheHits: 0,

  pendingHits: 0,

  generatedEmbeddings: 0,

  failedEmbeddings: 0,
};

function getEmbeddingLifecycleMetrics() {
  return {
    ...embeddingLifecycleMetrics,
  };
}

async function executeEmbeddingRequest(
  normalizedInput: string
) {
  return openai.embeddings.create(
    {
      model: EMBEDDING_MODEL,

      input: normalizedInput,
    },
    {
      signal:
        createEmbeddingAbortSignal(),
    }
  );
}

export async function generateEmbedding(
  text: string
): Promise<number[]> {
  const requestId =
    createEmbeddingRequestId();

  const start =
    performance.now();

  try {
    const normalizedInput =
      normalizeEmbeddingInput(
        text
      );

    if (
      shouldSkipEmbeddingGeneration(
        normalizedInput
      )
    ) {
      logEmbeddingStage(
        "embedding-skipped",
        {
          requestId,

          reason:
            "input-too-small",
        }
      );

      return createEmptyEmbedding();
    }

    const cacheKey =
      createEmbeddingCacheKey(
        normalizedInput
      );

    const cachedEmbedding =
      getCachedEmbedding(
        cacheKey
      );

    if (cachedEmbedding) {
      embeddingLifecycleMetrics.cacheHits +=
        1;

      logEmbeddingStage(
        "embedding-cache-hit",
        {
          requestId,

          dimensions:
            cachedEmbedding.length,
        }
      );

      return cachedEmbedding;
    }

    const pendingRequest =
      getPendingEmbeddingRequest(
        cacheKey
      );

    if (pendingRequest) {
      embeddingLifecycleMetrics.pendingHits +=
        1;

      logEmbeddingStage(
        "embedding-pending-request-hit",
        {
          requestId,
        }
      );

      return pendingRequest;
    }

    logEmbeddingStage(
      "embedding-request-started",
      {
        requestId,

        model:
          EMBEDDING_MODEL,

        inputLength:
          normalizedInput.length,
      }
    );

    logEmbeddingStage(
      "embedding-cache-metrics",
      getEmbeddingCacheMetrics()
    );

    logEmbeddingStage(
      "embedding-lifecycle-metrics",
      getEmbeddingLifecycleMetrics()
    );

    const embeddingRequest =
      executeEmbeddingRequest(
        normalizedInput
      )
        .then((response) => {
          const embedding =
            response.data?.[0]
              ?.embedding;

          if (
            !validateEmbedding(
              embedding
            )
          ) {
            throw new Error(
              "Invalid embedding response"
            );
          }

          embeddingLifecycleMetrics.generatedEmbeddings +=
            1;

          const durationMs = Number(
            (
              performance.now() -
              start
            ).toFixed(2)
          );

          logEmbeddingStage(
            "embedding-request-completed",
            {
              requestId,

              durationMs,

              dimensions:
                embedding.length,

              usage:
                response.usage || null,
            }
          );

          cacheEmbedding(
            cacheKey,
            embedding
          );

          return embedding;
        })
        .finally(() => {
          clearPendingEmbeddingRequest(
            cacheKey
          );
        });

    setPendingEmbeddingRequest(
      cacheKey,
      embeddingRequest
    );

    const embedding =
      await embeddingRequest;

    return embedding;
  } catch (error) {
    embeddingLifecycleMetrics.failedEmbeddings +=
      1;

    logEmbeddingError(
      "embedding-request-error",
      {
        requestId,

        error,
      }
    );

    return createEmptyEmbedding();
  }
}