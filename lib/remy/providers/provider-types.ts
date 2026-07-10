/**
 * Remy Platform (v2) — CONVERSATION PROVIDER TYPES (pure, type-only surface).
 *
 * The structured vocabulary for the conversation PROVIDER abstraction. These are ONLY type/interface
 * definitions describing what a FUTURE provider adapter would report — they carry NO network/SDK/fetch
 * behaviour and no live state. The supported provider names are declared here; NONE are implemented.
 *
 * PURE: type-only imports; no runtime code, no network/persistence.
 */
import type { ConversationOutput } from "@/lib/remy/core/family-types";
import type { ProviderError } from "./provider-errors";

/** The supported (future) provider names — NONE are implemented in this abstraction. */
export type ProviderName =
  | "deferred"
  | "openai"
  | "anthropic"
  | "gemini"
  | "azure-openai"
  | "ollama"
  | "lm-studio"
  | "custom-enterprise";

/** Capabilities a (future) provider adapter may declare it supports. */
export type ProviderCapability =
  | "text-generation"
  | "streaming"
  | "citations"
  | "system-prompt"
  | "temperature"
  | "token-usage"
  | "json-mode";

/** Semantic version of a (future) provider adapter. */
export interface ProviderVersion {
  major: number;
  minor: number;
  patch: number;
}

/** Structured limits a (future) provider adapter would advertise. */
export interface ProviderLimits {
  maxInputTokens: number;
  maxOutputTokens: number;
  maxRequestsPerMinute: number;
}

/** Static configuration a (future) provider adapter exposes. `implemented` is always false here. */
export interface ProviderConfiguration {
  name: ProviderName;
  model: string;
  temperature: number;
  capabilities: ProviderCapability[];
  limits: ProviderLimits;
  version: ProviderVersion;
  /** True only when a real adapter implementation exists — always false in this abstraction. */
  implemented: boolean;
}

export type ProviderHealthStatus = "unimplemented" | "ready" | "degraded" | "unavailable";

/** A structured health report — never a live network probe; this abstraction reports "unimplemented". */
export interface ProviderHealth {
  name: ProviderName;
  status: ProviderHealthStatus;
  detail: string;
}

/**
 * The structured result a (future) provider call would return. The provider layer may ONLY accept a
 * `ConversationOutput` request and return a `ConversationOutput` — it never retrieves / ranks / reasons /
 * scores / plans / renders / composes.
 */
export interface ProviderResult {
  ok: boolean;
  provider: ProviderName;
  output: ConversationOutput | null;
  error: ProviderError | null;
}
