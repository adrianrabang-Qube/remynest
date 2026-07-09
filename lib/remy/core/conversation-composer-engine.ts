/**
 * Remy Platform (v2) — CONVERSATION COMPOSER ENGINE (pure) — the FIRST natural-language-PLANNING layer.
 *
 * The deterministic intelligence stack is COMPLETE, and the Conversation Rendering layer has already
 * chosen the render instructions. This engine adds NO intelligence: it consumes ONLY the approved
 * `ConversationRender` (+ the `AnswerAssembly` it renders) and prepares a deterministic COMPOSITION PLAN
 * — composition sections, paragraph plans, sentence plans (structural roles only), reference plans
 * (pointers to real entities), and a flow — that a FUTURE LLM/API provider would verbalize.
 *
 * It generates NO language: no sentences, no paragraphs, no prose, no prompts, no LLM calls. It performs
 * NO retrieval / search / ranking / reasoning / chronology-construction / significance / evidence-scoring
 * / factual decisions. Every output field is a structured id, enum, or number. The tone/style/audience/
 * intent controls are deterministic metadata that generate NO language.
 *
 * PURE: type-only imports; no React/DOM/Supabase/fetch/timers/clock/Date/Math.random/persistence/network/
 * LLM. Internal only — nothing renders.
 */
import type {
  AnswerAssembly,
  AnswerEvidenceKind,
  AnswerSection,
  ConversationAudience,
  ConversationComposition,
  ConversationCompositionContext,
  ConversationCompositionMetadata,
  ConversationCompositionSection,
  ConversationCompositionSummary,
  ConversationFlow,
  ConversationIntent,
  ConversationParagraph,
  ConversationReferencePlan,
  ConversationRender,
  ConversationRenderSection,
  ConversationSentencePlan,
  ConversationStyle,
} from "./family-types";

export interface ConversationComposerInput {
  conversationRender: ConversationRender;
  answerAssembly: AnswerAssembly;
  style?: ConversationStyle;
  audience?: ConversationAudience;
  intent?: ConversationIntent;
}

/** How many real references group into one paragraph plan. */
const REFERENCES_PER_PARAGRAPH = 4;

const clamp100 = (n: number): number => Math.max(0, Math.min(100, Math.round(n)));

/** Composition role from the render section's own structured style (no language). */
function roleOf(style: ConversationRenderSection["style"]): ConversationCompositionSection["role"] {
  if (style === "summary") return "summary";
  if (style === "highlight") return "lead";
  if (style === "supporting") return "aside";
  return "body";
}

/** Map each of an answer section's real ids to its evidence kind (memory wins on the rare collision). */
function kindMapOf(section: AnswerSection | undefined): Map<string, AnswerEvidenceKind> {
  const m = new Map<string, AnswerEvidenceKind>();
  if (!section) return m;
  for (const id of section.memoryIds) if (!m.has(id)) m.set(id, "memory");
  for (const id of section.journeyIds) if (!m.has(id)) m.set(id, "journey");
  for (const id of section.chapterIds) if (!m.has(id)) m.set(id, "chapter");
  for (const id of section.anchorIds) if (!m.has(id)) m.set(id, "anchor");
  for (const t of section.themeIds) if (!m.has(t)) m.set(t, "theme");
  for (const id of section.personIds) if (!m.has(id)) m.set(id, "person");
  return m;
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export function buildConversationComposition(
  input: ConversationComposerInput,
): ConversationComposition {
  const style: ConversationStyle = input.style ?? "conversational";
  const audience: ConversationAudience = input.audience ?? "family";
  const intent: ConversationIntent = input.intent ?? "inform";
  const render = input.conversationRender;
  const assembly = input.answerAssembly;

  const answerSectionById = new Map<string, AnswerSection>();
  for (const s of assembly.sections) answerSectionById.set(s.id, s);

  const sections: ConversationCompositionSection[] = [];
  const paragraphs: ConversationParagraph[] = [];
  const sentencePlans: ConversationSentencePlan[] = [];
  const referencePlans: ConversationReferencePlan[] = [];
  const transitionIds: string[] = [];

  const renderSections = render.sections; // already ordered by renderOrder (deterministic)
  const lastSectionIndex = renderSections.length - 1;

  renderSections.forEach((rs, si) => {
    const sectionId = `compose-${rs.id}`;
    const kindOf = kindMapOf(answerSectionById.get(rs.sectionId));

    // Reference plans for the render section's own already-selected evidence ids.
    const sectionRefs: ConversationReferencePlan[] = rs.evidenceIds.map((refId, ri) => ({
      id: `${sectionId}-r${ri}`,
      kind: kindOf.get(refId) ?? "memory",
      refId,
      sentencePlanId: null,
    }));

    // Group references into paragraph plans; always at least one paragraph.
    const chunks = chunk(sectionRefs, REFERENCES_PER_PARAGRAPH);
    const effectiveChunks = chunks.length > 0 ? chunks : [[]];
    const paragraphIds: string[] = [];

    effectiveChunks.forEach((chunkRefs, pi) => {
      const paragraphId = `${sectionId}-p${pi}`;
      paragraphIds.push(paragraphId);
      const sentenceIds: string[] = [];
      const paragraphRefIds: string[] = [];
      let sIndex = 0;
      const pushSentence = (
        kind: ConversationSentencePlan["kind"],
        refIdsForSentence: string[],
      ): string => {
        const id = `${paragraphId}-s${sIndex}`;
        sentencePlans.push({ id, paragraphId, order: sIndex, kind, referenceIds: refIdsForSentence });
        sentenceIds.push(id);
        sIndex += 1;
        return id;
      };

      if (si === 0 && pi === 0) pushSentence("opening", []);
      pushSentence("topic", []);
      for (const ref of chunkRefs) {
        const sid = pushSentence("evidence", [ref.id]);
        ref.sentencePlanId = sid;
        paragraphRefIds.push(ref.id);
      }

      const isLastParagraph = pi === effectiveChunks.length - 1;
      if (si === lastSectionIndex && isLastParagraph) {
        pushSentence("closing", []);
      } else if (si < lastSectionIndex && isLastParagraph) {
        transitionIds.push(pushSentence("transition", []));
      }

      paragraphs.push({
        id: paragraphId,
        sectionId,
        order: pi,
        sentencePlanIds: sentenceIds,
        referenceIds: paragraphRefIds,
      });
    });

    referencePlans.push(...sectionRefs);
    sections.push({
      id: sectionId,
      renderSectionId: rs.id,
      order: si,
      role: roleOf(rs.style),
      importance: rs.importance,
      paragraphIds,
    });
  });

  // ---- Flow (structural ordering + transition pointers only) ----
  const sectionIdSet = new Set(sections.map((s) => s.id));
  const composeIdOf = (renderSectionId: string | null): string | null => {
    if (renderSectionId == null) return null;
    const id = `compose-${renderSectionId}`;
    return sectionIdSet.has(id) ? id : null;
  };
  const openingSectionId = composeIdOf(render.metadata.preferredOpening) ?? (sections[0]?.id ?? null);
  const closingSectionId =
    composeIdOf(render.metadata.preferredClosing) ??
    (sections.length > 0 ? sections[sections.length - 1].id : null);
  const flow: ConversationFlow = {
    openingSectionId,
    closingSectionId,
    transitionIds,
    sectionOrder: sections.map((s) => s.id),
  };

  const emphasis = render.metadata.emphasis
    .map((rid) => `compose-${rid}`)
    .filter((id) => sectionIdSet.has(id));

  const metadata: ConversationCompositionMetadata = {
    style,
    audience,
    intent,
    openingSectionId,
    closingSectionId,
    emphasis,
    tone: render.context.tone,
    continuity: clamp100(render.metadata.continuity),
    confidence: clamp100(render.metadata.confidence),
  };

  const context: ConversationCompositionContext = {
    style,
    audience,
    intent,
    verbosity: render.context.verbosity,
    paragraphCount: paragraphs.length,
    sentenceCount: sentencePlans.length,
    referenceCount: referencePlans.length,
    depth: clamp100(render.context.depth),
  };

  const summary: ConversationCompositionSummary = {
    sectionCount: sections.length,
    paragraphCount: paragraphs.length,
    sentenceCount: sentencePlans.length,
    referenceCount: referencePlans.length,
    confidence: clamp100(render.metadata.confidence),
    complexity: clamp100(
      Math.min(50, sections.length * 6) +
        Math.min(30, paragraphs.length * 4) +
        Math.min(20, sentencePlans.length * 2),
    ),
  };

  return { sections, paragraphs, sentencePlans, referencePlans, flow, metadata, context, summary };
}
