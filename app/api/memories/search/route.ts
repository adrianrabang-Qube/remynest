import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { generateEmbedding } from "@/lib/embeddings";
import { checkPremium } from "@/lib/premium";
import { canUseSemanticSearch } from "@/lib/billing/usage-limits";
import { resolveActiveProfileId } from "@/lib/context-resolver";
import { signMemories } from "@/lib/memory-media-signing";

const SEARCH_TAG =
  "memory-search-engine";

const SEARCH_MATCH_THRESHOLD =
  0.2;

const SEARCH_MATCH_COUNT =
  20;

// Over-fetch semantic candidates from match_memories, then scope to the active
// workspace by memory_profile_id. Generous so workspace scoping keeps full recall.
const SEARCH_RANK_CANDIDATES =
  100;

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
    // ENTITLEMENT (semantic search is premium — plans.ts: semanticSearch)
    // Enforced at the API so it cannot be bypassed if the UI gate is skipped.
    // =====================================

    const { plan } =
      await checkPremium();

    if (
      !canUseSemanticSearch(plan)
    ) {
      logSearchStage(
        "search-entitlement-blocked",
        {
          requestId,
          plan,
        }
      );

      return NextResponse.json(
        {
          error: "Upgrade required",
          feature: "semantic_search",
          code: "UPGRADE_REQUIRED",
        },
        {
          status: 402,
        }
      );
    }

    // =====================================
    // BODY
    // =====================================

    const body =
      await req.json();

    // Authoritative workspace scoping uses memory_profile_id, resolved
    // SERVER-SIDE from the active-context cookie (same source as the memories
    // list path) — never trust a client-supplied workspace/profile. NULL = My
    // Nest (personal); a profile id = that specific care profile.
    const activeProfileId =
      await resolveActiveProfileId();

    const isPersonalWorkspace =
      activeProfileId === null;

    logSearchStage(
      "workspace-context-detected",
      {
        requestId,
        workspace: isPersonalWorkspace
          ? "my-nest"
          : "care",
        activeProfileId,
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

    // 1) RANK semantically across the user's memories. match_memories is used
    //    purely for vector ranking here: its legacy workspace_type_input filter
    //    is unreliable (personal rows are mislabeled 'care') and it cannot scope
    //    to a specific care profile. We over-fetch candidates, then scope below.
    const {
      data: ranked,
      error,
    } = await supabase.rpc(
      "match_memories",
      {
        query_embedding:
          embedding,
        match_threshold:
          SEARCH_MATCH_THRESHOLD,
        match_count:
          SEARCH_RANK_CANDIDATES,
        user_id_input:
          user.id,
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

    const rankedRows = Array.isArray(ranked)
      ? (ranked as Array<{ id?: string; similarity?: number }>)
      : [];

    const rankedIds = rankedRows
      .map((r) => r.id)
      .filter(
        (id): id is string => typeof id === "string"
      );

    if (rankedIds.length === 0) {
      return NextResponse.json(
        createEmptySearchResults()
      );
    }

    // 2) SCOPE to the active workspace by memory_profile_id — the SAME rule as
    //    the memories list path (app/api/memories/route.ts). This is the single
    //    authoritative discriminator and prevents any cross-workspace leakage
    //    (personal <-> care, and across distinct care profiles).
    let scopedQuery = supabase
      .from("memories")
      .select("*")
      .eq("user_id", user.id)
      .in("id", rankedIds);

    scopedQuery = isPersonalWorkspace
      ? scopedQuery.is(
          "memory_profile_id",
          null
        )
      : scopedQuery.eq(
          "memory_profile_id",
          activeProfileId
        );

    const {
      data: scopedRows,
      error: scopeError,
    } = await scopedQuery;

    if (scopeError) {
      logSearchError(
        "search-scope-error",
        {
          requestId,
          error: scopeError,
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

    // 3) Re-apply the semantic ranking order and attach similarity for the client.
    const similarityById = new Map(
      rankedRows
        .filter(
          (
            r
          ): r is {
            id: string;
            similarity?: number;
          } => typeof r.id === "string"
        )
        .map((r) => [
          r.id,
          typeof r.similarity === "number"
            ? r.similarity
            : 0,
        ])
    );

    const normalizedResults = (
      scopedRows || []
    )
      .map((row) => ({
        ...row,
        similarity:
          similarityById.get(row.id) ?? 0,
      }))
      .sort(
        (a, b) =>
          (b.similarity || 0) -
          (a.similarity || 0)
      )
      .slice(0, SEARCH_MATCH_COUNT);

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
      await signMemories(normalizedResults)
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