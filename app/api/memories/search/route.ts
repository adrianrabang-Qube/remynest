import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { generateEmbedding } from "@/lib/embeddings";

const SEARCH_TAG =
  "memory-search-engine";

const SEARCH_MATCH_THRESHOLD =
  0.2;

const SEARCH_MATCH_COUNT =
  20;

const SEARCH_QUERY_MAX_LENGTH =
  500;

const SEARCH_QUERY_MIN_LENGTH =
  2;

function logSearchStage(
  stage: string,
  metadata?: unknown
) {
  console.info(
    `[${SEARCH_TAG}] ${stage}`,
    metadata || {}
  );
}

function logSearchError(
  stage: string,
  error: unknown
) {
  console.error(
    `[${SEARCH_TAG}] ${stage}`,
    error
  );
}

function createSearchRequestId() {
  return crypto.randomUUID();
}

function normalizeSearchQuery(
  query: string
) {
  return query
    .replace(/\s+/g, " ")
    .trim()
    .slice(
      0,
      SEARCH_QUERY_MAX_LENGTH
    );
}

function validateSearchQuery(
  query: string
) {
  if (!query) {
    return "Query required";
  }

  if (
    query.length <
    SEARCH_QUERY_MIN_LENGTH
  ) {
    return `Query must contain at least ${SEARCH_QUERY_MIN_LENGTH} characters`;
  }

  if (
    query.length >
    SEARCH_QUERY_MAX_LENGTH
  ) {
    return `Query exceeds ${SEARCH_QUERY_MAX_LENGTH} characters`;
  }

  return null;
}

function normalizeSearchResults(
  results: any[]
) {
  return results
    .filter(Boolean)
    .sort(
      (a, b) =>
        (b.similarity || 0) -
        (a.similarity || 0)
    );
}

function createEmptySearchResults() {
  return [];
}

export async function POST(req: Request) {
  const requestId =
    createSearchRequestId();

  const start =
    performance.now();

  try {
    const supabase =
      await createClient();

    logSearchStage(
      "search-request-started",
      {
        requestId,
      }
    );

    // =====================================
    // AUTH
    // =====================================

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      logSearchStage(
        "search-unauthorized",
        {
          requestId,
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

    // =====================================
    // BODY
    // =====================================

    const body =
      await req.json();

    const workspaceType =
      body.workspaceType ||
      "care";

    logSearchStage(
      "workspace-context-detected",
      {
        requestId,
        workspaceType,
      }
    );

    const normalizedQuery =
      normalizeSearchQuery(
        body.query || ""
      );

    const validationError =
      validateSearchQuery(
        normalizedQuery
      );

    if (validationError) {
      logSearchStage(
        "search-validation-failed",
        {
          requestId,
          validationError,
        }
      );

      return NextResponse.json(
        {
          error:
            validationError,
        },
        {
          status: 400,
        }
      );
    }

    logSearchStage(
      "embedding-generation-started",
      {
        requestId,
        queryLength:
          normalizedQuery.length,
      }
    );

    // =====================================
    // GENERATE EMBEDDING
    // =====================================

    const embedding =
      await generateEmbedding(
        normalizedQuery
      );

    if (
      !embedding ||
      embedding.length === 0
    ) {
      logSearchStage(
        "embedding-generation-skipped",
        {
          requestId,
        }
      );

      return NextResponse.json(
        createEmptySearchResults()
      );
    }

    // =====================================
    // SEMANTIC SEARCH
    // =====================================

    const {
      data,
      error,
    } = await supabase.rpc(
      "match_memories",
      {
        query_embedding:
          embedding,
        match_threshold:
          SEARCH_MATCH_THRESHOLD,
        match_count:
          SEARCH_MATCH_COUNT,
        user_id_input:
          user.id,
        workspace_type_input:
          workspaceType,
      }
    );

    if (error) {
      logSearchError(
        "semantic-search-error",
        {
          requestId,
          error,
        }
      );

      return NextResponse.json(
        {
          error:
            "Search failed",
        },
        {
          status: 500,
        }
      );
    }

    const normalizedResults =
      normalizeSearchResults(
        data || []
      );

    const durationMs = Number(
      (
        performance.now() -
        start
      ).toFixed(2)
    );

    logSearchStage(
      "semantic-search-completed",
      {
        requestId,
        results:
          normalizedResults.length,
        durationMs,
      }
    );

    return NextResponse.json(
      normalizedResults
    );
  } catch (error) {
    logSearchError(
      "search-engine-error",
      {
        requestId,
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