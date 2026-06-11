import type { RemyMood, RemyTone } from "./types";

/**
 * Remy's persona — the single place that defines who Remy is and how Remy
 * sounds. Both the text engine (today) and the future avatar (tomorrow) read
 * from here, so Remy stays one consistent companion across every surface.
 */
export const REMY = {
  name: "Remy",
  role: "Your companion",
  /** Avatar resting expression when there's nothing notable to surface. */
  defaultMood: "calm" as RemyMood,
};

/** Map an observation's tone to the avatar mood it should express. */
export const TONE_MOOD: Record<RemyTone, RemyMood> = {
  celebratory: "happy",
  encouraging: "happy",
  informative: "attentive",
  gentle: "thoughtful",
  reassuring: "calm",
};

export interface RemyVoice {
  /** Subject of a sentence: "Mary" (care) or "You" (personal). */
  subject: string;
  /** Possessive: "Mary’s" or "your". */
  possessive: string;
  /** Verb agreement for the subject: "has" or "have". */
  hasHave: string;
  isCare: boolean;
}

/**
 * Build human, grammatically-correct phrasing for the active context so Remy
 * never reads like a template ("Mary has 3…" vs "You have 3…").
 */
export function remyVoice(
  subjectName: string | null,
  isCare: boolean
): RemyVoice {
  if (isCare && subjectName) {
    return {
      subject: subjectName,
      possessive: `${subjectName}’s`,
      hasHave: "has",
      isCare: true,
    };
  }
  return {
    subject: "You",
    possessive: "your",
    hasHave: "have",
    isCare: false,
  };
}
