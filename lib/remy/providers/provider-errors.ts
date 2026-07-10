/**
 * Remy Platform (v2) — CONVERSATION PROVIDER ERRORS (pure).
 *
 * Structured, deterministic errors for the conversation PROVIDER abstraction layer. This module is
 * part of the provider seam only — it defines NO network/SDK/fetch/async behaviour. A future real
 * provider adapter (OpenAI / Anthropic / …) may reuse these error codes; until then, the only error a
 * provider raises is the deferred "Provider not implemented." raised by the deferred stub.
 *
 * PURE: no imports; no React/DOM/Supabase/fetch/timers/clock/Date/Math.random/persistence/network.
 */
export type ProviderErrorCode =
  | "not-implemented"
  | "unsupported-provider"
  | "invalid-request"
  | "rate-limited"
  | "timeout"
  | "provider-failure";

/** A throwable, structured provider error (never carries live network state). */
export class ProviderError extends Error {
  readonly code: ProviderErrorCode;
  readonly provider: string;

  constructor(code: ProviderErrorCode, message: string, provider = "deferred") {
    super(message);
    this.name = "ProviderError";
    this.code = code;
    this.provider = provider;
  }
}

/** The canonical error raised by the deferred provider stub — no adapter is implemented yet. */
export function notImplementedError(provider = "deferred"): ProviderError {
  return new ProviderError("not-implemented", "Provider not implemented.", provider);
}
