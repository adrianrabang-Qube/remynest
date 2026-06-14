import type { RemyVoiceLine } from "./voice-engine";
import type { RemyBriefing } from "./briefing";

/**
 * Remy Actions V1 — a structured action layer at the end of the pipeline:
 *
 *   … → Briefing → Home → Conversation → Actions
 *
 * It creates nothing. A pure, deterministic SELECTION of the CTAs that already
 * exist on the (already ranked) voice lines: the primary is the briefing's next
 * action (the highest-ranked CTA), the rest are the remaining CTAs in their
 * existing order (deduped by destination). No generation, inference, new ranking
 * or new scoring.
 */
export interface RemyAction {
  label: string;
  href: string;
  /** The observation this action came from (context for renderers). */
  text: string;
}

export interface RemyActions {
  primaryAction: RemyAction | null;
  secondaryActions: RemyAction[];
  actionCount: number;
}

export interface RemyActionsInput {
  voiceLines: RemyVoiceLine[];
  briefing: RemyBriefing;
  /**
   * A CTA href already presented elsewhere on the surface (e.g. the
   * conversation's featured CTA). It's skipped so Actions complements rather
   * than duplicates it; the next-ranked CTA is promoted to primary.
   */
  excludeHref?: string;
}

export function buildRemyActions(input: RemyActionsInput): RemyActions {
  const { voiceLines, briefing, excludeHref } = input;

  const seen = new Set<string>();
  if (excludeHref) seen.add(excludeHref);

  // Primary = the briefing's next action (highest-ranked CTA), unless it's the
  // excluded one — in which case the next-ranked CTA is promoted below.
  let primaryAction: RemyAction | null = null;
  const next = briefing.nextAction;
  if (next?.cta && !seen.has(next.cta.href)) {
    primaryAction = { label: next.cta.label, href: next.cta.href, text: next.text };
    seen.add(next.cta.href);
  }

  // Remaining CTAs in the voice lines' existing rank order, deduped by href.
  // No re-ranking.
  const secondaryActions: RemyAction[] = [];
  for (const line of voiceLines) {
    if (!line.cta || seen.has(line.cta.href)) continue;
    seen.add(line.cta.href);
    const action = {
      label: line.cta.label,
      href: line.cta.href,
      text: line.text,
    };
    if (primaryAction) secondaryActions.push(action);
    else primaryAction = action;
  }

  return {
    primaryAction,
    secondaryActions,
    actionCount: (primaryAction ? 1 : 0) + secondaryActions.length,
  };
}
