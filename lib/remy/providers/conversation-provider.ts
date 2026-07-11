/**
 * Remy Platform (v2) — CONVERSATION PROVIDER ADAPTER (interface only).
 *
 * The single provider ABSTRACTION for the ONE Remy platform. A conversation provider accepts the
 * canonical immutable `ConversationRequest` (the prompt + contract + citations built by the request
 * engine) and returns a `ConversationResponse` with `text` filled — nothing more. (Migrated in Phase 21
 * from the legacy `ConversationOutput` request model to the dedicated `ConversationRequest` →
 * `ConversationResponse` architecture; `ConversationOutput` is now `@deprecated`.)
 *
 * This module defines ONLY the interface — NO implementation, NO network, NO SDK, NO async body.
 *
 * ADAPTERS: OpenAI is IMPLEMENTED (Phase 22 — the only real adapter; it isolates the OpenAI SDK / network).
 * The remaining providers (Anthropic, Gemini, Azure OpenAI, Ollama, LM Studio, Custom Enterprise) are still
 * deferred/future. Each real adapter is the ONLY place a `fetch` / SDK / real LLM call may ever live.
 *
 * RESPONSIBILITIES — a provider adapter is ONLY allowed to:
 *   • accept a `ConversationRequest`,
 *   • call the provider,
 *   • return a `ConversationResponse`.
 * It MUST NOT retrieve memories, rank, reason, score, plan, render, or compose — all of that is already
 * complete in the deterministic intelligence + presentation + verbalizer layers upstream.
 *
 * PURE: type-only imports; no runtime code.
 */
import type { ConversationRequest, ConversationResponse } from "@/lib/remy/core/family-types";
import type { ProviderConfiguration, ProviderHealth, ProviderName } from "./provider-types";

export interface ConversationProviderAdapter {
  /** The provider this adapter represents. */
  readonly name: ProviderName;
  /**
   * Verbalize the canonical `ConversationRequest` into a filled `ConversationResponse` (fills `text`). The
   * OpenAI adapter implements this (Phase 22); every other provider's deferred stub throws "Provider not
   * implemented." It MUST NOT change chronology / importance / ordering / references / facts / memory ids —
   * it may only choose wording.
   */
  generateConversation(request: ConversationRequest): Promise<ConversationResponse>;
  /** The adapter's static configuration (model / capabilities / limits / version / implemented). */
  configuration(): ProviderConfiguration;
  /** The adapter's structured health (deferred stubs report "unimplemented"; an implemented adapter such as OpenAI reports its live readiness). */
  health(): ProviderHealth;
}
