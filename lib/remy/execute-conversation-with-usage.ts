/**
 * Instrumented conversation execution (Phase 26/27) — observability + cost accounting around the SINGLE
 * execution path. This wrapper is the ONLY caller of `executeConversation`; it does NOT reach the provider
 * itself, so there is still exactly ONE execution path (UI → action → here → executeConversation →
 * getProductionProvider() → OpenAIProvider). It adds NO prompt/engine/provider changes — it only measures.
 *
 * Quota ENFORCEMENT is intentionally NOT here — it lives in the caller (the story action) as a PRE-check
 * BEFORE the expensive pipeline build, so a quota-blocked user never pays that cost and gets a structured
 * result (this wrapper can only return a `ConversationResponse`). By the time execution reaches here the call
 * is already authorized. Behaviour is preserved: on success it returns the provider's response unchanged; on
 * failure it re-throws the original error. Usage logging NEVER throws and never alters the result.
 */
import { getProductionProvider } from "@/lib/remy/providers/provider-registry";
import {
  executeConversation,
  type ConversationExecutionInput,
} from "@/lib/remy/providers/conversation-execution";
import type { ConversationResponse } from "@/lib/remy/core/family-types";
import { estimateCostUsd } from "@/lib/ai/usage/cost";
import {
  classifyAiError,
  recordAiUsage,
  type AiUsageContext,
} from "@/lib/ai/usage/ai-usage";

/**
 * Execute a conversation and record its usage. `context` (userId / workspaceId / operation) is supplied by the
 * server caller — never the client. The caller is responsible for the quota gate (pre-check); this wrapper
 * executes + measures only.
 */
export async function executeConversationWithUsage(
  input: ConversationExecutionInput,
  context: AiUsageContext,
): Promise<ConversationResponse> {
  const startedAt = Date.now();
  try {
    const response = await executeConversation(input);
    const latencyMs = Date.now() - startedAt;

    // A returned-but-non-"generated" response is a provider-side content failure, not an execution success.
    const ok = response.status === "generated";
    const estimatedCost = ok
      ? estimateCostUsd(
          response.provider,
          response.model,
          response.usage.promptTokens,
          response.usage.completionTokens,
        )
      : 0;

    await recordAiUsage({
      ...context,
      provider: response.provider,
      model: response.model,
      promptTokens: response.usage.promptTokens,
      completionTokens: response.usage.completionTokens,
      totalTokens: response.usage.totalTokens,
      estimatedCost,
      latencyMs,
      status: ok ? "success" : "error",
      errorCode: ok ? null : "invalid_response",
    });

    return response;
  } catch (error) {
    const latencyMs = Date.now() - startedAt;
    // No response to read from — record the production provider's identity for the failed call.
    const config = getProductionProvider().configuration();
    await recordAiUsage({
      ...context,
      provider: config.name,
      model: config.model,
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      estimatedCost: 0,
      latencyMs,
      status: "error",
      errorCode: classifyAiError(error),
    });
    throw error; // preserve existing behaviour (the caller handles it)
  }
}
