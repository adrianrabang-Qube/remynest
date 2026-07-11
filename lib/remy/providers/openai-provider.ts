/**
 * Remy Platform (v2) — OPENAI CONVERSATION PROVIDER (the FIRST real provider adapter).
 *
 * The first production implementation of `ConversationProviderAdapter`. It is a PURE EXECUTION layer: it
 * receives the immutable `ConversationRequest` (built by the deterministic request engine), sends the
 * supplied prompt to OpenAI EXACTLY as given, and returns a `ConversationResponse`. It performs NO
 * intelligence — it does NOT retrieve, rank, reason, score, plan, render, compose, rewrite the prompt,
 * modify citations, reorder, or enrich. The deterministic Remy intelligence pipeline is entirely upstream
 * and unchanged.
 *
 * The official OpenAI SDK, network, env, and async are ISOLATED inside this file (the ONLY place a real
 * LLM/network call may live). Error handling converts SDK failures into structured `ProviderError`s and
 * never leaks the raw SDK exception. No retries / timeouts / fallbacks yet (later phases).
 *
 * Runtime note: this adapter is server-side (reads `process.env.OPENAI_API_KEY`) and DORMANT — nothing in
 * the current pipeline invokes it; it runs only when a caller explicitly resolves + calls the "openai"
 * provider. Constructing it is side-effect-free (no env read / no client at construction — lazy).
 */
import OpenAI from "openai";

import type {
  ConversationProvider,
  ConversationRequest,
  ConversationResponse,
  ConversationResponseUsage,
} from "@/lib/remy/core/family-types";
import type { ConversationProviderAdapter } from "./conversation-provider";
import { ProviderError } from "./provider-errors";
import type {
  ProviderCapability,
  ProviderConfiguration,
  ProviderHealth,
  ProviderLimits,
  ProviderName,
  ProviderVersion,
} from "./provider-types";

const DEFAULT_MODEL = "gpt-4o-mini";
/**
 * This adapter's provider tag for the response models, typed as `ConversationProvider` — the literal
 * "openai" is valid in BOTH the `ConversationProvider` (family-types) and `ProviderName` (providers) unions,
 * so no mapping layer is needed. (The two unions still diverge for other providers; that reconciliation is a
 * documented follow-up for when the divergent providers are implemented.)
 */
const PROVIDER_TAG: ConversationProvider = "openai";
/** Execution-only temperature; the model verbalizes the supplied composition (it never adds content). */
const TEMPERATURE = 0;
const CAPABILITIES: readonly ProviderCapability[] = [
  "text-generation",
  "system-prompt",
  "temperature",
  "token-usage",
  "citations",
];
const LIMITS: ProviderLimits = {
  maxInputTokens: 128000,
  maxOutputTokens: 16384,
  maxRequestsPerMinute: 500,
};
const VERSION: ProviderVersion = { major: 1, minor: 0, patch: 0 };

/** Convert an SDK / network failure into a structured provider error — never leak the raw exception. */
function toProviderError(error: unknown, provider: ProviderName): ProviderError {
  if (error instanceof ProviderError) return error;
  const status = (error as { status?: unknown } | null)?.status;
  if (typeof status === "number") {
    if (status === 429) return new ProviderError("rate-limited", "OpenAI rate limit exceeded.", provider);
    if (status >= 500) return new ProviderError("provider-failure", "OpenAI service error.", provider);
    return new ProviderError("invalid-request", "OpenAI rejected the request.", provider);
  }
  return new ProviderError("provider-failure", "OpenAI provider failed.", provider);
}

export interface OpenAIProviderOptions {
  model?: string;
  apiKey?: string;
}

export class OpenAIProvider implements ConversationProviderAdapter {
  readonly name: ProviderName = "openai";
  private readonly configuredModel?: string;
  private readonly configuredApiKey?: string;

  constructor(options?: OpenAIProviderOptions) {
    // Light, side-effect-free construction (no env read, no client) so the registry stays deterministic.
    this.configuredModel = options?.model;
    this.configuredApiKey = options?.apiKey;
  }

  private resolveModel(): string {
    return this.configuredModel ?? process.env.OPENAI_MODEL ?? DEFAULT_MODEL;
  }

  private resolveApiKey(): string | undefined {
    return this.configuredApiKey ?? process.env.OPENAI_API_KEY;
  }

  async generateConversation(request: ConversationRequest): Promise<ConversationResponse> {
    const apiKey = this.resolveApiKey();
    if (!apiKey) {
      throw new ProviderError("invalid-request", "OPENAI_API_KEY is not configured.", this.name);
    }
    const model = this.resolveModel();
    const client = new OpenAI({ apiKey });

    try {
      // Send the immutable prompt EXACTLY as supplied by the request engine — no rewriting, no injected
      // intelligence, no reordering, no enrichment. `prompt.full` is sent verbatim as the request content.
      const completion = await client.chat.completions.create({
        model,
        temperature: TEMPERATURE,
        stream: false,
        messages: [{ role: "user", content: request.prompt.full }],
      });

      const text = completion.choices[0]?.message?.content ?? "";
      const resolvedModel = completion.model || model;
      const usage: ConversationResponseUsage = {
        promptTokens: completion.usage?.prompt_tokens ?? 0,
        completionTokens: completion.usage?.completion_tokens ?? 0,
        totalTokens: completion.usage?.total_tokens ?? 0,
      };

      return {
        text,
        provider: PROVIDER_TAG,
        model: resolvedModel,
        usage,
        status: "generated",
        citations: request.citations, // passed through EXACTLY — never modified/reordered
        metadata: { provider: PROVIDER_TAG, model: resolvedModel, temperature: TEMPERATURE, generated: true },
      };
    } catch (error) {
      throw toProviderError(error, this.name);
    }
  }

  configuration(): ProviderConfiguration {
    return {
      name: this.name,
      model: this.resolveModel(),
      temperature: TEMPERATURE,
      capabilities: [...CAPABILITIES],
      limits: { ...LIMITS },
      version: { ...VERSION },
      implemented: true,
    };
  }

  health(): ProviderHealth {
    const ready = Boolean(this.resolveApiKey());
    return {
      name: this.name,
      status: ready ? "ready" : "unavailable",
      detail: ready ? "OpenAI adapter ready." : "OPENAI_API_KEY is not configured.",
    };
  }
}
