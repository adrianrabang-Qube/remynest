/**
 * Remy Platform (v2) — CONVERSATION RENDERING ENGINE (pure) — the FIRST presentation-layer engine.
 *
 * The deterministic intelligence stack is COMPLETE (memory-understanding → … → answer-assembly). This
 * engine adds NO intelligence: it consumes ONLY the already-complete `AnswerAssembly` and prepares
 * deterministic RENDER INSTRUCTIONS (structured metadata) that a FUTURE conversational / LLM layer will
 * use to speak the factual package.
 *
 * It does NOT retrieve, search, rank, reason, infer, compare, evaluate evidence, build or change
 * chronology, generate facts, or generate any natural language. It touches ONLY its `answerAssembly`
 * argument (plus optional tone / verbosity / perspective controls, which are themselves deterministic
 * metadata that generate NO language). No prose, no narration, no paragraphs, no prompts, no answers.
 *
 * PURE: type-only imports; no React/DOM/Supabase/fetch/timers/clock/Date/Math.random/persistence/
 * network/LLM. Internal only — nothing renders.
 */
import type {
  AnswerAssembly,
  AnswerSection,
  ConversationPerspective,
  ConversationRender,
  ConversationRenderContext,
  ConversationRenderMetadata,
  ConversationRenderSection,
  ConversationRenderSummary,
  ConversationTone,
  ConversationVerbosity,
} from "./family-types";

export interface ConversationRenderInput {
  answerAssembly: AnswerAssembly;
  tone?: ConversationTone;
  verbosity?: ConversationVerbosity;
  perspective?: ConversationPerspective;
}

/** Deterministic section budget per verbosity control. */
const VERBOSITY_SECTIONS: Record<ConversationVerbosity, number> = {
  brief: 4,
  normal: 8,
  detailed: 16,
};
const MAX_EVIDENCE_PER_SECTION = 12;
const MAX_EMPHASIS = 4;

const clamp100 = (n: number): number => Math.max(0, Math.min(100, Math.round(n)));

/** A structured render-style hint from the section's existing kind + weight (no language). */
function styleOf(section: AnswerSection): ConversationRenderSection["style"] {
  if (section.kind === "summary") return "summary";
  if (section.weight >= 66) return "highlight";
  if (section.weight >= 33) return "standard";
  return "supporting";
}

/** The section's own real supporting entity ids (deduped, sorted, bounded) — never fabricated. */
function evidenceIdsOf(section: AnswerSection): string[] {
  const set = new Set<string>();
  for (const id of section.memoryIds) set.add(id);
  for (const id of section.journeyIds) set.add(id);
  for (const id of section.chapterIds) set.add(id);
  for (const id of section.anchorIds) set.add(id);
  for (const t of section.themeIds) set.add(t);
  for (const id of section.personIds) set.add(id);
  return [...set].sort().slice(0, MAX_EVIDENCE_PER_SECTION);
}

export function buildConversationRender(input: ConversationRenderInput): ConversationRender {
  const tone: ConversationTone = input.tone ?? "neutral";
  const verbosity: ConversationVerbosity = input.verbosity ?? "normal";
  const perspective: ConversationPerspective = input.perspective ?? "assistant";
  const maxSections = VERBOSITY_SECTIONS[verbosity];
  const assembly = input.answerAssembly;
  const includeChronology = verbosity !== "brief" && assembly.chronology.entries.length > 0;

  // The assembly sections already arrive sorted by weight desc, id asc — take the top `maxSections`
  // and prepare a render instruction for each (structured pointers + hints only).
  const chosen = assembly.sections.slice(0, maxSections);
  const sections: ConversationRenderSection[] = chosen.map((section, i) => ({
    id: `render-${section.id}`,
    sectionId: section.id,
    renderOrder: i,
    style: styleOf(section),
    importance: clamp100(section.weight),
    evidenceIds: evidenceIdsOf(section),
  }));

  const summarySection = sections.find((s) => s.style === "summary");
  const metadata: ConversationRenderMetadata = {
    preferredOpening: sections.length > 0 ? sections[0].id : null,
    preferredClosing: summarySection
      ? summarySection.id
      : sections.length > 0
        ? sections[sections.length - 1].id
        : null,
    emphasis: sections
      .filter((s) => s.style === "highlight")
      .slice(0, MAX_EMPHASIS)
      .map((s) => s.id),
    continuity: clamp100(assembly.coverage.timelineCompleteness),
    confidence: clamp100(assembly.coverage.confidence),
  };

  const distinctEvidence = new Set<string>();
  for (const s of sections) for (const id of s.evidenceIds) distinctEvidence.add(id);
  const distinctStyles = new Set(sections.map((s) => s.style)).size;
  const summary: ConversationRenderSummary = {
    sectionCount: sections.length,
    evidenceCount: distinctEvidence.size,
    confidence: clamp100(assembly.coverage.confidence),
    renderComplexity: clamp100(Math.min(60, sections.length * 8) + Math.min(40, distinctStyles * 10)),
  };

  const context: ConversationRenderContext = {
    tone,
    verbosity,
    perspective,
    maxSections,
    includeChronology,
    depth: clamp100(assembly.context.contextDepth),
  };

  return { sections, metadata, summary, context };
}
