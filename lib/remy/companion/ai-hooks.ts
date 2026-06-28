/**
 * Remy companion — FUTURE AI EVENT INTERFACE (architecture only).
 *
 * The eventual AI layer registers a `RemyAIHooks` implementation; the companion maps these
 * events onto states + animations (e.g. onThinking → "thinking"/play("thinking")). NOTHING
 * is implemented or wired in Phase 1 — this only fixes the contract so the AI integration
 * is additive. No AI, no network, no conversation here.
 */
export interface RemyAIHooks {
  onListening?: () => void;
  onThinking?: () => void;
  onSpeaking?: (text?: string) => void;
  onMemoryCreated?: (memoryId: string) => void;
  onCelebration?: () => void;
}

export const NOOP_REMY_AI_HOOKS: RemyAIHooks = {};
