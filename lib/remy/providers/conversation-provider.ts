/**
 * Remy Platform (v2) — CONVERSATION PROVIDER ADAPTER (interface only).
 *
 * The single provider ABSTRACTION for the ONE Remy platform. A conversation provider accepts the
 * deterministic `ConversationOutput` request (the prompt + contract + citations built by the verbalizer
 * engine) and returns a `ConversationOutput` with `text` filled — nothing more.
 *
 * This module defines ONLY the interface — NO implementation, NO network, NO SDK, NO async body.
 *
 * FUTURE ADAPTERS (documented, NONE implemented): OpenAI, Anthropic, Gemini, Azure OpenAI, Ollama,
 * LM Studio, Custom Enterprise. Each future adapter is the ONLY place a `fetch` / SDK / real LLM call
 * may ever live.
 *
 * RESPONSIBILITIES — a provider adapter is ONLY allowed to:
 *   • accept a `ConversationOutput` request,
 *   • call the provider,
 *   • return a `ConversationOutput`.
 * It MUST NOT retrieve memories, rank, reason, score, plan, render, or compose — all of that is already
 * complete in the deterministic intelligence + presentation + verbalizer layers upstream.
 *
 * PURE: type-only imports; no runtime code.
 */
import type { ConversationOutput } from "@/lib/remy/core/family-types";
import type { ProviderConfiguration, ProviderHealth, ProviderName } from "./provider-types";

export interface ConversationProviderAdapter {
  /** The provider this adapter represents. */
  readonly name: ProviderName;
  /**
   * Verbalize the deterministic request into a filled `ConversationOutput` (fills `text`). A future
   * adapter implements this; the deferred stub throws "Provider not implemented." It MUST NOT change
   * chronology / importance / ordering / references / facts / memory ids — it may only choose wording.
   */
  generateConversation(request: ConversationOutput): Promise<ConversationOutput>;
  /** The adapter's static configuration (model / capabilities / limits / version / implemented). */
  configuration(): ProviderConfiguration;
  /** The adapter's structured health (this abstraction always reports "unimplemented"). */
  health(): ProviderHealth;
}
