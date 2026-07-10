/**
 * Remy Platform (v2) — CONVERSATION REQUEST ENGINE (pure) — the dedicated provider-REQUEST builder.
 *
 * Architectural refactor only: the Phase-18 `ConversationOutput` overloaded "provider request" (an
 * empty-`text` object) and "provider output". This engine builds the dedicated, immutable
 * `ConversationRequest` (provider INPUT) from the same deterministic inputs — the prompt (contract +
 * structured composition), the citations back to real ids, the provider-agnostic controls, and a
 * summary. It carries NO generated text; a future provider adapter will consume a `ConversationRequest`
 * and return a `ConversationResponse` (built elsewhere, later).
 *
 * It performs NO intelligence — NO retrieval / ranking / chronology / reasoning / language generation.
 * It only transforms the already-complete composition/render/assembly into the request model. PURE:
 * type-only imports; no provider/fetch/SDK/async/Promise/Date/Math.random/persistence/network/React/DOM.
 */
import type {
  AnswerAssembly,
  AnswerSection,
  ConversationComposition,
  ConversationContract,
  ConversationParagraph,
  ConversationPrompt,
  ConversationReferencePlan,
  ConversationRender,
  ConversationRenderSection,
  ConversationRequest,
  ConversationRequestMetadata,
  ConversationRequestSummary,
  ConversationSentencePlan,
  ConversationCitation,
} from "./family-types";

export interface ConversationRequestInput {
  conversationComposition: ConversationComposition;
  conversationRender: ConversationRender;
  answerAssembly: AnswerAssembly;
}

/** The mandatory prompt contract — a provider may ONLY verbalize; it may never retrieve, rank, or invent. */
const PROMPT_CONTRACT: readonly string[] = [
  "You are not allowed to retrieve information.",
  "You are not allowed to rank memories.",
  "You are not allowed to infer new facts.",
  "You are not allowed to change chronology.",
  "You must verbalize ONLY the supplied ConversationRequest.",
  "Every factual statement must trace to supplied references.",
  "If information is missing, do not invent it.",
];
const CONTRACT_VERSION = 1;

/** Rough deterministic token estimate (≈4 chars/token). */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export function buildConversationRequest(input: ConversationRequestInput): ConversationRequest {
  const composition = input.conversationComposition;
  const render = input.conversationRender;
  const assembly = input.answerAssembly;

  // Read-only lookups over the already-computed plans (never a search or ranking).
  const paragraphById = new Map<string, ConversationParagraph>();
  for (const p of composition.paragraphs) paragraphById.set(p.id, p);
  const sentenceById = new Map<string, ConversationSentencePlan>();
  for (const s of composition.sentencePlans) sentenceById.set(s.id, s);
  const referenceById = new Map<string, ConversationReferencePlan>();
  for (const r of composition.referencePlans) referenceById.set(r.id, r);
  const renderSectionById = new Map<string, ConversationRenderSection>();
  for (const rs of render.sections) renderSectionById.set(rs.id, rs);
  const answerSectionById = new Map<string, AnswerSection>();
  for (const s of assembly.sections) answerSectionById.set(s.id, s);

  const resolveRefIds = (referenceIds: string[]): string[] =>
    referenceIds.map((rid) => referenceById.get(rid)?.refId).filter((x): x is string => x != null);

  // ---- System / contract portion of the prompt ----
  const systemLines: string[] = ["[REMY CONVERSATION REQUEST — PROVIDER CONTRACT]"];
  for (const clause of PROMPT_CONTRACT) systemLines.push("- " + clause);
  const system = systemLines.join("\n");

  // ---- Body portion: controls + flow + factual sources + the structured composition ----
  const bodyLines: string[] = [];
  bodyLines.push(
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
  bodyLines.push(
    "[FLOW] opening=" +
      (composition.flow.openingSectionId ?? "none") +
      " closing=" +
      (composition.flow.closingSectionId ?? "none") +
      " transitions=" +
      composition.flow.transitionIds.join(",") +
      " emphasis=" +
      render.metadata.emphasis.join(","),
  );
  bodyLines.push("");
  bodyLines.push("[FACTUAL SOURCES — verbalize ONLY these ids; trace every statement to them]");
  bodyLines.push(
    "dominantTheme=" +
      assembly.summary.dominantTheme +
      " dominantAnchor=" +
      (assembly.summary.dominantAnchor ?? "none"),
  );
  bodyLines.push("memories=" + assembly.memories.join(","));
  bodyLines.push("people=" + assembly.people.join(","));
  bodyLines.push("journeys=" + assembly.journeys.join(","));
  bodyLines.push("chapters=" + assembly.chapters.join(","));
  bodyLines.push("anchors=" + assembly.anchors.join(","));
  bodyLines.push("themes=" + assembly.themes.join(","));
  bodyLines.push("");
  bodyLines.push("[COMPOSITION — follow this exact section/paragraph/sentence order; do not reorder]");
  for (const section of composition.sections) {
    const rs = renderSectionById.get(section.renderSectionId);
    // answerSectionById is consulted only to confirm the section is a real assembly section (a lookup,
    // never a search/rank); it strengthens the "real ids only" contract on the request.
    const known = answerSectionById.has(rs ? rs.sectionId : "");
    bodyLines.push(
      "SECTION " +
        section.id +
        " role=" +
        section.role +
        " importance=" +
        section.importance +
        (rs ? " renderStyle=" + rs.style : "") +
        (known ? " source=assembly" : ""),
    );
    for (const paragraphId of section.paragraphIds) {
      const paragraph = paragraphById.get(paragraphId);
      if (!paragraph) continue;
      bodyLines.push("  PARAGRAPH " + paragraph.id);
      for (const sentenceId of paragraph.sentencePlanIds) {
        const sentence = sentenceById.get(sentenceId);
        if (!sentence) continue;
        bodyLines.push(
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
  const body = bodyLines.join("\n");
  const full = system + "\n\n" + body;

  const prompt: ConversationPrompt = { system, body, full };
  const contract: ConversationContract = { clauses: [...PROMPT_CONTRACT], version: CONTRACT_VERSION };

  // ---- Citations: paragraph → sentence ids → reference ids → real entity ids (traceability) ----
  const citations: ConversationCitation[] = composition.paragraphs.map((paragraph) => ({
    paragraphId: paragraph.id,
    sentenceIds: paragraph.sentencePlanIds,
    referenceIds: paragraph.referenceIds,
    refIds: resolveRefIds(paragraph.referenceIds),
  }));

  const metadata: ConversationRequestMetadata = {
    style: composition.metadata.style,
    audience: composition.metadata.audience,
    intent: composition.metadata.intent,
    tone: render.context.tone,
    verbosity: render.context.verbosity,
  };

  const summary: ConversationRequestSummary = {
    sectionCount: composition.sections.length,
    paragraphCount: composition.paragraphs.length,
    sentenceCount: composition.sentencePlans.length,
    referenceCount: composition.referencePlans.length,
    citationCount: citations.length,
    promptTokens: estimateTokens(full),
  };

  return { prompt, contract, citations, metadata, summary };
}
