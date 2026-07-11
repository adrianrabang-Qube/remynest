/**
 * Remy Platform (v2) — CONVERSATION PROVIDER REGISTRY (pure, deterministic) — the SINGLE AUTHORITATIVE
 * provider resolver.
 *
 * As of Phase 23 this registry is the ONE canonical place a conversation provider is constructed and
 * resolved — nothing else in the app constructs or resolves a provider (verified: no importer outside
 * `lib/remy/providers/`). `getConversationProvider` is the canonical by-name resolver; `getProductionProvider`
 * resolves the authoritative production provider (`PRODUCTION_PROVIDER` = "openai"). Both RESOLVE ONLY — they
 * return an adapter instance; they NEVER execute it (no `generateConversation` call, no network). The provider
 * layer therefore remains DORMANT: Phase 24 will wire the production provider into an execution path.
 *
 * "openai" maps to the REAL `OpenAIProvider` (Phase 22 — which isolates the OpenAI SDK / network); every
 * OTHER supported name still maps to the `DeferredProvider` stub, whose `generateConversation` simply THROWS
 * "Provider not implemented." A future phase replaces the remaining stubs with real adapters (each adapter is
 * the ONLY place a `fetch` / SDK / real LLM call may live).
 *
 * This registry module itself is PURE (no network/async): resolving/constructing providers is
 * side-effect-free — the OpenAI adapter reads env + creates its client lazily inside `generateConversation`,
 * never at construction — so `getConversationProvider`/`getProductionProvider`/`listProviders`/
 * `isProviderImplemented` are deterministic and make no network call.
 */
import type { ConversationRequest, ConversationResponse } from "@/lib/remy/core/family-types";
import type { ConversationProviderAdapter } from "./conversation-provider";
import { OpenAIProvider } from "./openai-provider";
import { notImplementedError } from "./provider-errors";
import type {
  ProviderConfiguration,
  ProviderHealth,
  ProviderLimits,
  ProviderName,
  ProviderVersion,
} from "./provider-types";

const DEFAULT_LIMITS: ProviderLimits = {
  maxInputTokens: 0,
  maxOutputTokens: 0,
  maxRequestsPerMinute: 0,
};
const DEFAULT_VERSION: ProviderVersion = { major: 0, minor: 0, patch: 0 };

/** Deterministic order of the supported provider names — "openai" is implemented (Phase 22); the rest are deferred. */
export const PROVIDER_NAMES: readonly ProviderName[] = [
  "deferred",
  "openai",
  "anthropic",
  "gemini",
  "azure-openai",
  "ollama",
  "lm-studio",
  "custom-enterprise",
];

/**
 * The deferred provider stub — the fallback for every provider name that has NO real adapter yet. It
 * implements the interface but is connected to NO network/SDK: the verbalization is DEFERRED, so
 * `generateConversation` simply throws "Provider not implemented." A future real adapter (per provider name)
 * replaces it. ("openai" already resolves to the real `OpenAIProvider` instead of this stub.)
 */
export class DeferredProvider implements ConversationProviderAdapter {
  readonly name: ProviderName;

  constructor(name: ProviderName = "deferred") {
    this.name = name;
  }

  generateConversation(request: ConversationRequest): Promise<ConversationResponse> {
    // No network, no SDK, no async — the real verbalization is deferred to a future provider adapter.
    // Behaviour unchanged from Phase 19: the deferred stub still throws "Provider not implemented." Only
    // the request/response TYPES migrated (ConversationOutput -> ConversationRequest/ConversationResponse).
    void request;
    throw notImplementedError(this.name);
  }

  configuration(): ProviderConfiguration {
    return {
      name: this.name,
      model: "none",
      temperature: 0,
      capabilities: [],
      limits: { ...DEFAULT_LIMITS },
      version: { ...DEFAULT_VERSION },
      implemented: false,
    };
  }

  health(): ProviderHealth {
    return { name: this.name, status: "unimplemented", detail: "Provider not implemented." };
  }
}

/**
 * The provider registry. "openai" now resolves to the REAL `OpenAIProvider` (Phase 22); every other name
 * still maps to a `DeferredProvider` stub (none implemented). Construction is side-effect-free (no env
 * read / no network / no client), so the registry stays deterministic. Frozen shape.
 */
const REGISTRY: Readonly<Record<ProviderName, ConversationProviderAdapter>> = {
  deferred: new DeferredProvider("deferred"),
  openai: new OpenAIProvider(),
  anthropic: new DeferredProvider("anthropic"),
  gemini: new DeferredProvider("gemini"),
  "azure-openai": new DeferredProvider("azure-openai"),
  ollama: new DeferredProvider("ollama"),
  "lm-studio": new DeferredProvider("lm-studio"),
  "custom-enterprise": new DeferredProvider("custom-enterprise"),
};

/**
 * The canonical by-name provider resolver — the single authoritative way to obtain a provider adapter
 * (deterministic; unknown names fall back to the deferred stub). RESOLUTION ONLY: it returns the adapter; it
 * does not call `generateConversation`, open a network connection, or execute the provider.
 */
export function getConversationProvider(name: ProviderName): ConversationProviderAdapter {
  return REGISTRY[name] ?? REGISTRY.deferred;
}

/**
 * The authoritative PRODUCTION provider — the single provider name the platform treats as its default
 * conversational implementation. A deterministic constant (never read from env, never chosen at runtime), so
 * the registry stays byte-deterministic. As of Phase 22 the production provider is OpenAI (the only
 * implemented adapter); every other name remains deferred.
 */
export const PRODUCTION_PROVIDER: ProviderName = "openai";

/**
 * Resolve the authoritative production provider adapter through the registry. RESOLUTION ONLY — it returns the
 * adapter instance; it does NOT call `generateConversation`, open a network connection, or execute the
 * provider. It delegates to `getConversationProvider` (the single canonical resolver — there is no second
 * resolution path). Dormant: nothing invokes it yet; Phase 24 will use this seam to actually run the provider.
 */
export function getProductionProvider(): ConversationProviderAdapter {
  return getConversationProvider(PRODUCTION_PROVIDER);
}

/** The supported provider names, in deterministic order. */
export function listProviders(): ProviderName[] {
  return [...PROVIDER_NAMES];
}

/** Whether a provider has a real adapter implementation (true for "openai" since Phase 22; false for the deferred stubs). */
export function isProviderImplemented(name: ProviderName): boolean {
  return REGISTRY[name]?.configuration().implemented ?? false;
}
