import type { RemyUnderstanding } from "./understanding";
import type { RemyVoiceLine } from "./voice-engine";
import type { RemyBriefing } from "./briefing";

/**
 * Remy Conversation V1 — a presentation/interaction COMPOSITION at the end of the
 * pipeline:
 *
 *   … → Voice → Briefing → Home → Conversation
 *
 * It creates nothing. A pure, deterministic SELECTION over existing outputs: the
 * opening line (briefing headline), the featured observation + CTA (top-ranked),
 * the topics Remy actually has (distinct lenses present in the understanding),
 * and a small set of existing navigation destinations. No generation,
 * summarization, inference, ranking change or AI.
 */
export interface RemyLink {
  label: string;
  href: string;
}

export interface RemyConversation {
  /** Opening message — the top briefing headline. */
  openingMessage: string | null;
  /** Highest-ranked observation (reserved for renderers; not required). */
  featuredObservation: RemyVoiceLine | null;
  /** Highest-ranked CTA. */
  featuredCTA: RemyLink | null;
  /** Topics Remy actually understands — distinct lenses present, as links. */
  suggestedTopics: RemyLink[];
  /** Existing navigation destinations to jump into. */
  quickActions: RemyLink[];
}

export interface RemyConversationInput {
  understanding: RemyUnderstanding;
  voiceLines: RemyVoiceLine[];
  briefing: RemyBriefing;
}

/** Existing app routes offered as quick actions (real destinations, not content). */
const QUICK_ACTIONS: RemyLink[] = [
  { label: "Add a memory", href: "/memories/new" },
  { label: "Memories", href: "/memories" },
  { label: "Timeline", href: "/timeline" },
  { label: "People", href: "/profiles" },
];

export function buildRemyConversation(
  input: RemyConversationInput,
): RemyConversation {
  const { understanding, voiceLines, briefing } = input;

  // Suggested topics = the distinct lenses Remy actually has facets for (existing
  // topics only), each linking to its evidence surface. Selection, never invented.
  const seen = new Set<string>();
  const suggestedTopics: RemyLink[] = [];
  for (const facet of understanding.facets) {
    if (!facet.lens || seen.has(facet.lens.href)) continue;
    seen.add(facet.lens.href);
    suggestedTopics.push({ label: facet.lens.label, href: facet.lens.href });
  }

  return {
    openingMessage: briefing.headline,
    featuredObservation: voiceLines[0] ?? null,
    featuredCTA: briefing.nextAction?.cta ?? null,
    suggestedTopics,
    quickActions: QUICK_ACTIONS,
  };
}
