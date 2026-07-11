/**
 * Remy Platform (v2) — CONVERSATION PROVIDER REGISTRY (pure, deterministic).
 *
 * The deterministic registry of conversation providers. As of Phase 22, "openai" maps to the REAL
 * `OpenAIProvider` (which isolates the OpenAI SDK / network); every OTHER supported name still maps to the
 * `DeferredProvider` stub, whose `generateConversation` simply THROWS "Provider not implemented." A future
 * phase replaces the remaining stubs with real adapters (each adapter is the ONLY place a `fetch` / SDK /
 * real LLM call may live).
 *
 * This registry module itself is PURE (no network/async): resolving/constructing providers is
 * side-effect-free — the OpenAI adapter reads env + creates its client lazily inside `generateConversation`,
 * never at construction — so `getConversationProvider`/`listProviders`/`isProviderImplemented` are
 * deterministic and make no network call.
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

/** Deterministic order of the supported (future) provider names — NONE implemented. */
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
 * The ONLY registered adapter. It implements the interface but is connected to NO network/SDK: the
 * verbalization is DEFERRED, so `generateConversation` simply throws "Provider not implemented." A
 * future real adapter (per provider name) replaces it.
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

/** Resolve a provider adapter by name (deterministic); unknown names fall back to the deferred stub. */
export function getConversationProvider(name: ProviderName): ConversationProviderAdapter {
  return REGISTRY[name] ?? REGISTRY.deferred;
}

/** The supported provider names, in deterministic order. */
export function listProviders(): ProviderName[] {
  return [...PROVIDER_NAMES];
}

/** Whether a provider has a real adapter implementation — always false in this abstraction. */
export function isProviderImplemented(name: ProviderName): boolean {
  return REGISTRY[name]?.configuration().implemented ?? false;
}
