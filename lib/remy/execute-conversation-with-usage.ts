/**
 * Instrumented conversation execution (Phase 26) — observability + cost accounting around the SINGLE
 * execution path. This wrapper is now the ONLY caller of `executeConversation`; it does NOT reach the
 * provider itself, so there is still exactly ONE execution path (UI → action → here → executeConversation →
 * getProductionProvider() → OpenAIProvider). It adds NO prompt/engine/provider changes — it only measures.
 *
 * Behaviour is preserved: on success it returns the provider's `ConversationResponse` unchanged; on failure
 * it re-throws the original error (the caller's existing try/catch still handles it). Usage logging NEVER
 * throws and never alters the result.
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
import { canExecuteConversation } from "@/lib/ai/usage/quota";

/**
 * Execute a conversation and record its usage. `context` (userId / workspaceId / operation) is supplied by the
 * server caller — never the client. The `canExecuteConversation` gate is consulted first (the single, ready
 * enforcement point — it ALWAYS allows today and short-circuits with no DB read while limits are off).
 */
export async function executeConversationWithUsage(
  input: ConversationExecutionInput,
  context: AiUsageContext,
): Promise<ConversationResponse> {
  // Gate PER-USER (cost control must not be bypassable by switching workspaces); the row below still
  // RECORDS the actual workspaceId.
  const gate = await canExecuteConversation(context.userId);
  if (!gate.allowed) {
    // Never happens while limits are off; this is the real (dormant) enforcement seam.
    throw new Error(`AI usage limit reached: ${gate.reason ?? "unknown"}`);
  }

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
