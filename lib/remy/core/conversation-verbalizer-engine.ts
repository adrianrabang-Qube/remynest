/**
 * Remy Platform (v2) — CONVERSATION VERBALIZER ENGINE (pure) — the PROVIDER-boundary layer.
 *
 * This is the FIRST conversational provider layer — architecturally the ONLY place natural language
 * would be produced. But the actual LLM verbalization is DEFERRED (consistent with the launch-only
 * priority and the deferred AI connection): this engine performs NO network / LLM call. It is a PURE,
 * deterministic function that assembles the exact PROVIDER REQUEST a FUTURE provider adapter (OpenAI /
 * Anthropic / …) would send — the strict prompt (with the mandatory contract), the citations back to
 * real ids, and provider / generation / token metadata — and returns a `ConversationOutput` whose
 * `text` is empty (`metadata.verbalized = false`, `generation.status = "deferred"`) until a real
 * provider adapter fills it.
 *
 * It does NO intelligence: it consumes ONLY the already-complete `ConversationComposition` (+ the
 * `ConversationRender` and `AnswerAssembly` it composes) read-only, and it must NOT retrieve / search /
 * rank / infer / compare / evaluate-evidence / decide-chronology / score-significance / build-plans /
 * render-metadata / composition / hallucinate-facts / invent-references. The (future, deferred) provider
 * adapter is the ONLY place a `fetch`/network call may live — never this pure engine.
 *
 * PURE: type-only imports; no React/DOM/Supabase/fetch/timers/clock/Date/Math.random/persistence/network.
 */
import type {
  AnswerAssembly,
  ConversationComposition,
  ConversationGeneration,
  ConversationOutput,
  ConversationOutputMetadata,
  ConversationParagraph,
  ConversationProvider,
  ConversationReferencePlan,
  ConversationRender,
  ConversationRenderSection,
  ConversationSentencePlan,
  ConversationTokenUsage,
} from "./family-types";

export interface ConversationVerbalizerInput {
  conversationComposition: ConversationComposition;
  conversationRender: ConversationRender;
  answerAssembly: AnswerAssembly;
  provider?: ConversationProvider;
  model?: string;
  temperature?: number;
}

/**
 * The mandatory prompt contract — sent verbatim to the provider so the LLM may ONLY verbalize the
 * supplied composition and may never retrieve, rank, infer, or invent.
 */
const PROMPT_CONTRACT: readonly string[] = [
  "You are not allowed to retrieve information.",
  "You are not allowed to rank memories.",
  "You are not allowed to infer new facts.",
  "You are not allowed to change chronology.",
  "You must verbalize ONLY the supplied ConversationComposition.",
  "Every factual statement must trace to supplied references.",
  "If information is missing, do not invent it.",
];

/** Rough deterministic token estimate (≈4 chars/token) — replaced by real usage when a provider runs. */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export function buildConversationOutput(input: ConversationVerbalizerInput): ConversationOutput {
  const composition = input.conversationComposition;
  const render = input.conversationRender;
  const assembly = input.answerAssembly;
  const provider: ConversationProvider = input.provider ?? "deferred";
  const model = input.model ?? "none";
  const temperature = input.temperature ?? 0;

  // Read-only lookups over the already-computed plans (never a search or ranking).
  const paragraphById = new Map<string, ConversationParagraph>();
  for (const p of composition.paragraphs) paragraphById.set(p.id, p);
  const sentenceById = new Map<string, ConversationSentencePlan>();
  for (const s of composition.sentencePlans) sentenceById.set(s.id, s);
  const referenceById = new Map<string, ConversationReferencePlan>();
  for (const r of composition.referencePlans) referenceById.set(r.id, r);
  const renderSectionById = new Map<string, ConversationRenderSection>();
  for (const rs of render.sections) renderSectionById.set(rs.id, rs);

  const resolveRefIds = (referenceIds: string[]): string[] =>
    referenceIds.map((rid) => referenceById.get(rid)?.refId).filter((x): x is string => x != null);

  // ---- Build the deterministic provider prompt (contract + structured composition; never the answer) ----
  const lines: string[] = [];
  lines.push("[REMY CONVERSATION VERBALIZER — PROVIDER CONTRACT]");
  for (const clause of PROMPT_CONTRACT) lines.push("- " + clause);
  lines.push("");
  lines.push(
    "[CONTROLS] style=" +
      composition.metadata.style +
      " audience=" +
      composition.metadata.audience +
      " intent=" +
      composition.metadata.intent +
      " tone=" +
      render.context.tone +
      " verbosity=" +
      render.context.verbosity,
  );
  lines.push(
    "[FLOW] opening=" +
      (composition.flow.openingSectionId ?? "none") +
      " closing=" +
      (composition.flow.closingSectionId ?? "none") +
      " transitions=" +
      composition.flow.transitionIds.join(",") +
      " emphasis=" +
      render.metadata.emphasis.join(","),
  );
  lines.push("");
  lines.push("[FACTUAL SOURCES — verbalize ONLY these ids; trace every statement to them]");
  lines.push("dominantTheme=" + assembly.summary.dominantTheme + " dominantAnchor=" + (assembly.summary.dominantAnchor ?? "none"));
  lines.push("memories=" + assembly.memories.join(","));
  lines.push("people=" + assembly.people.join(","));
  lines.push("journeys=" + assembly.journeys.join(","));
  lines.push("chapters=" + assembly.chapters.join(","));
  lines.push("anchors=" + assembly.anchors.join(","));
  lines.push("themes=" + assembly.themes.join(","));
  lines.push("");
  lines.push("[COMPOSITION — follow this exact section/paragraph/sentence order; do not reorder]");
  for (const section of composition.sections) {
    const rs = renderSectionById.get(section.renderSectionId);
    lines.push(
      "SECTION " +
        section.id +
        " role=" +
        section.role +
        " importance=" +
        section.importance +
        (rs ? " renderStyle=" + rs.style : ""),
    );
    for (const paragraphId of section.paragraphIds) {
      const paragraph = paragraphById.get(paragraphId);
      if (!paragraph) continue;
      lines.push("  PARAGRAPH " + paragraph.id);
      for (const sentenceId of paragraph.sentencePlanIds) {
        const sentence = sentenceById.get(sentenceId);
        if (!sentence) continue;
        lines.push(
          "    SENTENCE " +
            sentence.id +
            " kind=" +
            sentence.kind +
            " refs=[" +
            resolveRefIds(sentence.referenceIds).join(",") +
            "]",
        );
      }
    }
  }
  const prompt = lines.join("\n");

  // ---- Citations: paragraph → sentence ids → reference ids → real entity ids (traceability) ----
  const citations = composition.paragraphs.map((paragraph) => ({
    paragraphId: paragraph.id,
    sentenceIds: paragraph.sentencePlanIds,
    referenceIds: paragraph.referenceIds,
    refIds: resolveRefIds(paragraph.referenceIds),
  }));

  const metadata: ConversationOutputMetadata = {
    provider,
    model,
    temperature,
    verbalized: false, // deferred — no real provider adapter has verbalized the text yet
    style: composition.metadata.style,
    audience: composition.metadata.audience,
    intent: composition.metadata.intent,
    tone: render.context.tone,
    verbosity: render.context.verbosity,
  };

  const promptTokens = estimateTokens(prompt);
  const tokens: ConversationTokenUsage = {
    promptTokens,
    completionTokens: 0, // nothing verbalized yet (deferred provider)
    totalTokens: promptTokens,
  };

  const generation: ConversationGeneration = {
    prompt,
    contract: [...PROMPT_CONTRACT],
    status: "deferred",
    sectionCount: composition.sections.length,
    paragraphCount: composition.paragraphs.length,
    sentenceCount: composition.sentencePlans.length,
    referenceCount: composition.referencePlans.length,
  };

  return {
    text: "", // deferred — a future provider adapter fills this; this pure engine makes no LLM call
    citations,
    metadata,
    tokens,
    generation,
  };
}
