/**
 * Remy Platform (v2) — VOICE ENGINE (ARCHITECTURE ONLY — no TTS implemented).
 *
 * The seam for Remy's future voice. It consumes abstract `RemyVoiceCue`s from the presentation
 * (a scripted line id or literal text) — never provider-specific detail. Future backends
 * (OpenAI Voice, ElevenLabs, Apple Speech, Azure, Google) implement this interface and are
 * selected in `createRemyVoiceEngine()`; consumers never change.
 *
 * Default backend is a NO-OP and DISABLED. Voice must be an explicit opt-in (privacy, cost,
 * accessibility), so nothing speaks until a backend lands AND `setEnabled(true)` is called.
 * Lip-sync (future) couples this engine's viseme stream to the Animation Engine — both are
 * platform-owned, so features are unaffected.
 */
import type { RemyVoiceCue } from "./presentation";

export interface RemyVoiceEngine {
  /** Speak an abstract cue (no-op until a backend + opt-in exist). */
  speak(cue: RemyVoiceCue): void;
  /** Stop any current utterance. */
  stop(): void;
  /** Enable/disable voice globally (opt-in). */
  setEnabled(enabled: boolean): void;
  isEnabled(): boolean;
}

/** The default engine: does nothing, stays disabled. Replace via `createRemyVoiceEngine()`. */
export function createNoopVoiceEngine(): RemyVoiceEngine {
  let enabled = false;
  return {
    speak(cue) {
      if (!enabled) return;
      if (process.env.NODE_ENV !== "production") {
        console.debug("[remy:voice] (noop) would speak", cue);
      }
    },
    stop() {},
    setEnabled(value) {
      enabled = value;
    },
    isEnabled() {
      return enabled;
    },
  };
}

/** The seam: returns the selected voice backend. Swap the backend, not the consumers. */
export function createRemyVoiceEngine(): RemyVoiceEngine {
  return createNoopVoiceEngine();
}
