/**
 * Remy Platform (v2) — CONVERSATION PROVIDER REGISTRY (pure, deterministic).
 *
 * The deterministic registry of conversation providers. NO provider is implemented: every supported
 * name maps to the `DeferredProvider` stub, whose `generateConversation` simply THROWS
 * "Provider not implemented." A future phase replaces a name's stub with a real adapter (the ONLY place
 * a `fetch` / SDK / real LLM call may ever live).
 *
 * PURE: type-only imports (+ the local error factory); no React/DOM/Supabase/fetch/timers/clock/Date/
 * Math.random/persistence/network/async.
 */
import type { ConversationOutput } from "@/lib/remy/core/family-types";
import type { ConversationProviderAdapter } from "./conversation-provider";
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

  generateConversation(request: ConversationOutput): Promise<ConversationOutput> {
    // No network, no SDK, no async — the real verbalization is deferred to a future provider adapter.
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

/** Every supported provider maps to a deferred stub (none implemented). Deterministic + frozen shape. */
const REGISTRY: Readonly<Record<ProviderName, ConversationProviderAdapter>> = {
  deferred: new DeferredProvider("deferred"),
  openai: new DeferredProvider("openai"),
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
