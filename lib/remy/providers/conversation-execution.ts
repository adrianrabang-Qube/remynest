/**
 * Remy Platform (v2) — CONVERSATION EXECUTION (Phase 24 — the FIRST production execution path).
 *
 * The single end-to-end seam that RUNS the already-built deterministic conversation pipeline against the
 * production provider. This is the first real execution of the pipeline built in Phases 18–23; it is NOT a
 * redesign, NOT prompt engineering, and NOT retrieval — it only wires the existing pieces together:
 *
 *   buildConversationRequest(...)  ->  getProductionProvider()  ->  generateConversation(request)  ->  ConversationResponse
 *
 * It performs NO intelligence (no retrieval / ranking / chronology / reasoning / significance / planning /
 * language generation). It:
 *   1. builds the immutable `ConversationRequest` from the already-computed composition / render / assembly
 *      via the pure request engine (`buildConversationRequest`), and
 *   2. resolves the authoritative production provider through the registry via `getProductionProvider()`
 *      (it NEVER instantiates a provider directly, NEVER imports OpenAI, and NEVER bypasses the registry), and
 *   3. calls `generateConversation(request)` to produce the `ConversationResponse`.
 *
 * The provider receives `request.prompt.full` EXACTLY as produced by the request engine — there is NO
 * rewriting, injection, enrichment, or prompt manipulation here (the provider itself sends `prompt.full`
 * verbatim). `ConversationRequest` and `ConversationResponse` are used exactly as defined; nothing is mutated.
 *
 * Placement: this module owns the network-capable boundary (it is `async` and can trigger a real provider
 * call), so it lives in the PROVIDER layer, never in the pure `lib/remy/core/*`. The only value it imports
 * from core is the pure `buildConversationRequest` transform (a safe one-way providers -> core dependency);
 * core stays provider-free.
 *
 * Verbalizer note: the deterministic architecture's "verbalization" is realized by (a) the request engine,
 * which builds the strict prompt (`ConversationRequest`, the provider INPUT), and (b) the OpenAIProvider,
 * which is the runtime verbalizer that turns it into text. The Phase-18 `buildConversationOutput` verbalizer
 * produces the now-`@deprecated` `ConversationOutput` (empty-text, deferred) — NOT the provider's input type —
 * so it is intentionally NOT in this live execution path (Phase 20 superseded its request-building role).
 *
 * Dormant: nothing in the app invokes this yet (no UI / no route). A future phase (Phase 25) wires it into a
 * user-facing conversational surface. Until then this is the callable activation seam, exactly like
 * `getProductionProvider()`.
 */
import { buildConversationRequest, type ConversationRequestInput } from "@/lib/remy/core/conversation-request-engine";
import type { ConversationRequest, ConversationResponse } from "@/lib/remy/core/family-types";
import { getProductionProvider } from "./provider-registry";

/** The deterministic pipeline outputs this execution seam needs — identical to the request engine's input. */
export type ConversationExecutionInput = ConversationRequestInput;

/**
 * The ONE production execution path: build the `ConversationRequest` from the already-complete deterministic
 * pipeline outputs, resolve the production provider through the registry, and execute it. Returns the
 * provider's `ConversationResponse`. The `ConversationRequest` (incl. `prompt.full`) is passed to the provider
 * EXACTLY as built — no rewriting / injection / enrichment / manipulation. Errors from the request build or
 * the provider (e.g. `ProviderError` when the provider is unconfigured or the SDK fails) propagate to the
 * caller unchanged.
 */
export async function executeConversation(input: ConversationExecutionInput): Promise<ConversationResponse> {
  const request: ConversationRequest = buildConversationRequest(input);
  const provider = getProductionProvider();
  return provider.generateConversation(request);
}
