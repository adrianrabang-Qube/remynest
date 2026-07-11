/**
 * AI usage logging (Phase 26) — types, error classification, and the service-role writer.
 *
 * Every real AI execution is recorded here (observability + cost accounting). Writes go through the
 * service-role client (scoped by an explicit user_id — the service role bypasses RLS) and NEVER throw: a
 * logging failure (incl. the migration not yet being applied) must never break AI execution. There is NO
 * enforcement here — this module only records.
 */
import { supabaseAdmin } from "@/utils/supabase/admin";
import { ProviderError } from "@/lib/remy/providers/provider-errors";

export type AiUsageStatus = "success" | "error";

/**
 * Structured failure taxonomy (differentiates the cases the phase calls out). Derived from the provider's
 * structured `ProviderError.code`, refined for a missing key; a non-provider throw is "unknown".
 */
export type AiUsageErrorCode =
  | "missing_api_key"
  | "timeout"
  | "rate_limited"
  | "provider_unavailable"
  | "invalid_request"
  | "invalid_response"
  | "unknown";

/** Identity/operation context supplied by the caller (never by the client). */
export interface AiUsageContext {
  userId: string;
  /** memory_profile_id (null = My Nest). */
  workspaceId: string | null;
  /** e.g. "story_narration". */
  operation: string;
}

/** A full usage row to persist (camelCase; mapped to the snake_case `ai_usage` columns). */
export interface RecordAiUsageInput extends AiUsageContext {
  provider: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCost: number;
  latencyMs: number;
  status: AiUsageStatus;
  errorCode: AiUsageErrorCode | null;
}

/**
 * Map a thrown error to the structured usage taxonomy. Reads the provider's own `code`, and for
 * `invalid-request` distinguishes a missing API key using a provider-AGNOSTIC check of the error
 * MESSAGE (not an env probe), so it works for any future provider. Never throws.
 */
export function classifyAiError(error: unknown): AiUsageErrorCode {
  if (error instanceof ProviderError) {
    switch (error.code) {
      case "rate-limited":
        return "rate_limited";
      case "timeout":
        return "timeout";
      case "provider-failure":
        return "provider_unavailable";
      case "not-implemented":
      case "unsupported-provider":
        return "provider_unavailable";
      case "invalid-request": {
        // Provider-AGNOSTIC missing-key detection from the error MESSAGE (e.g. "<PROVIDER>_API_KEY is not
        // configured") — no provider-specific env probe, so it works for any future provider.
        const msg = error.message.toLowerCase();
        const missingKey =
          msg.includes("not configured") ||
          (msg.includes("api key") && (msg.includes("missing") || msg.includes("unset"))) ||
          (msg.includes("api_key") && msg.includes("not"));
        return missingKey ? "missing_api_key" : "invalid_request";
      }
      default:
        return "unknown";
    }
  }
  return "unknown";
}

/**
 * Max time the awaited usage write may sit on the response critical path. A degraded write usually ERRORS
 * quickly (swallowed below), but a network stall could HANG; this bounds that so logging can never delay the
 * user's response by more than a few seconds (the insert may still complete in the background).
 */
const RECORD_TIMEOUT_MS = 3000;

/**
 * Persist one usage row. NEVER throws AND never hangs the caller — a degraded write (network, RLS, or the
 * migration not yet applied) is swallowed, and a stalled write is bounded by `RECORD_TIMEOUT_MS`. Callers
 * await it so the row is written before a serverless function may freeze, without risking the response path.
 */
export async function recordAiUsage(input: RecordAiUsageInput): Promise<void> {
  try {
    const insert = supabaseAdmin.from("ai_usage").insert({
      user_id: input.userId,
      workspace_id: input.workspaceId,
      provider: input.provider,
      model: input.model,
      operation: input.operation,
      prompt_tokens: Math.max(0, Math.trunc(input.promptTokens)),
      completion_tokens: Math.max(0, Math.trunc(input.completionTokens)),
      total_tokens: Math.max(0, Math.trunc(input.totalTokens)),
      estimated_cost: input.estimatedCost,
      latency_ms: Math.max(0, Math.trunc(input.latencyMs)),
      status: input.status,
      error_code: input.errorCode,
    });
    // Resolve when the insert settles OR the timeout fires — whichever first; never rejects.
    await new Promise<void>((resolve) => {
      const timer = setTimeout(resolve, RECORD_TIMEOUT_MS);
      Promise.resolve(insert).then(
        () => {
          clearTimeout(timer);
          resolve();
        },
        () => {
          clearTimeout(timer);
          resolve();
        },
      );
    });
  } catch {
    // Observability must never break execution — swallow.
  }
}
