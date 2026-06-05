/**
 * AI safety disclaimers — single source of truth.
 *
 * RemyNest is a healthcare-adjacent memory platform. Every AI surface must carry
 * a non-diagnostic disclaimer. Update copy here only; UI pulls from this file.
 * Final wording is subject to clinical/legal sign-off.
 */

export const DISCLAIMERS = {
  /** Reusable general footnote. */
  general:
    "RemyNest provides AI-generated reflections for personal, informational use only. It is not a medical device and does not provide medical advice, diagnosis, or treatment. Always consult a qualified healthcare professional.",

  /** Prominent banner for the Insights surface. */
  insights:
    "These insights are AI-generated patterns based on the memories you've recorded. They are not a medical assessment, diagnosis, or screening tool, and must not be used to make health decisions. If you have concerns about memory or cognition, consult a licensed clinician. In an emergency, contact your local emergency services.",

  /** Inline note for Memory Chat answers. */
  memoryChat:
    "Answers are AI-generated from your saved memories and may be incomplete or inaccurate. This is not medical advice.",

  /** Footnote for cognitive / risk cards and the memory detail AI sections. */
  cognitive:
    "This is an automated reflection of patterns in your recorded memories, not a clinical evaluation. It cannot detect, diagnose, or rule out any medical or cognitive condition.",
} as const;

/**
 * Safety preamble injected into LLM system prompts (e.g. Memory Chat) to enforce
 * non-diagnostic, observation-based responses.
 */
export const PROMPT_SAFETY_PREAMBLE = `SAFETY AND SCOPE RULES (always follow):
- You are not a medical professional. Never diagnose, screen for, predict, score, or rule out any condition, including Alzheimer's disease, dementia, mild cognitive impairment, or any other cognitive decline or disease.
- Never express medical certainty. Use tentative, observation-based language grounded only in the user's recorded memories (e.g., "the memories you recorded mention...").
- Do not describe the person's health status. Describe only patterns in the recorded data.
- If the conversation suggests distress, self-harm, or a possible medical emergency, gently encourage contacting a qualified healthcare professional or local emergency services. Do not diagnose.
- If information is missing, say so honestly. Never fabricate memories or facts.`;

export type DisclaimerKey = keyof typeof DISCLAIMERS;
