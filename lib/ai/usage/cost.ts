/**
 * AI cost calculation (Phase 26) — the SINGLE, isolated, provider-independent, model-aware cost layer.
 *
 * The provider returns REAL token counts; it does NOT return a price. This module converts (model, tokens)
 * into an estimated USD cost from ONE price table — so there are no hard-coded costs scattered through the
 * codebase. Prices are the published per-1M-token rates and are OPERATOR-UPDATABLE here (and easily expanded
 * to new providers/models). An unknown model returns 0 (we never guess a wrong number).
 *
 * Pure: no IO, no network, deterministic.
 */

/** Per-model price in USD per 1,000,000 tokens. Add rows here as new models are used. */
export interface ModelPrice {
  /** USD per 1M input (prompt) tokens. */
  inputPer1M: number;
  /** USD per 1M output (completion) tokens. */
  outputPer1M: number;
}

/**
 * Published price table (USD / 1M tokens). Keyed by the exact model id the provider reports. Update these as
 * the provider's public pricing changes; add new providers' models with the same shape. Values are estimates
 * for accounting/observability only — never billed to the user.
 */
export const MODEL_PRICES: Readonly<Record<string, ModelPrice>> = {
  // OpenAI — conversation
  "gpt-4o-mini": { inputPer1M: 0.15, outputPer1M: 0.6 },
  "gpt-4o": { inputPer1M: 2.5, outputPer1M: 10 },
  "gpt-4.1-mini": { inputPer1M: 0.4, outputPer1M: 1.6 },
  // OpenAI — embeddings (output tokens are 0 for embeddings)
  "text-embedding-3-small": { inputPer1M: 0.02, outputPer1M: 0 },
};

/** Look up a model's price, tolerating a provider-suffixed/dated id (e.g. "gpt-4o-mini-2024-07-18"). */
function resolveModelPrice(model: string): ModelPrice | null {
  const key = model.trim();
  if (MODEL_PRICES[key]) return MODEL_PRICES[key];
  // Fall back to the longest known prefix (handles dated/snapshot model ids).
  let best: ModelPrice | null = null;
  let bestLen = 0;
  for (const known of Object.keys(MODEL_PRICES)) {
    if (key.startsWith(known) && known.length > bestLen) {
      best = MODEL_PRICES[known];
      bestLen = known.length;
    }
  }
  return best;
}

/**
 * Estimate the USD cost of a single call from REAL token counts. `provider` is accepted for future
 * provider-specific pricing but pricing is model-keyed today. Returns 0 for an unknown model (never a guess).
 * Rounded to 6 dp (matches the `ai_usage.estimated_cost numeric(12,6)` column).
 */
export function estimateCostUsd(
  provider: string,
  model: string,
  promptTokens: number,
  completionTokens: number,
): number {
  void provider; // reserved for future provider-specific pricing; pricing is model-keyed today
  const price = resolveModelPrice(model);
  if (!price) return 0;
  const input = (Math.max(0, promptTokens) / 1_000_000) * price.inputPer1M;
  const output = (Math.max(0, completionTokens) / 1_000_000) * price.outputPer1M;
  return Math.round((input + output) * 1_000_000) / 1_000_000;
}
