/**
 * Memory Intelligence V2 — CLASSIFICATION ENGINE (pure, deterministic, cacheable).
 *
 * Maps a memory's free-form `ai_category` + keywords into the CONTROLLED `MEMORY_CATEGORIES` taxonomy, and
 * flags protected-from-decay (medical/emergency/health) and slow-decay (milestone/childhood/family) classes.
 * Deterministic → the result can be CACHED (stored in `memory_intelligence.classification`); identical memories
 * are never re-classified. No GPT, no IO. This does NOT replace the existing `ai_category` enrichment — it maps
 * it into a stable V2 taxonomy for scoring.
 */
import { DECAY_CONFIG, MEMORY_CATEGORIES, type MemoryCategory } from "./config";
import { clamp01 } from "./math";
import type { MemoryClassification, MemoryIntelligenceInput } from "./types";

/** Keyword signals per controlled category (checked against ai_category + title + content + tags). */
const CATEGORY_KEYWORDS: Readonly<Record<MemoryCategory, readonly string[]>> = {
  family: ["family", "mother", "father", "mom", "dad", "parent", "son", "daughter", "sibling", "cousin", "aunt", "uncle", "grandma", "grandpa", "grandparent"],
  friends: ["friend", "friends", "buddy", "mate", "pal"],
  medical: ["medical", "doctor", "hospital", "surgery", "operation", "diagnosis", "treatment", "medication", "prescription", "clinic", "nurse", "illness", "disease", "cancer", "therapy"],
  health: ["health", "fitness", "exercise", "wellness", "diet", "sleep", "mental health", "checkup"],
  career: ["career", "job", "work", "office", "promotion", "boss", "colleague", "employment", "business", "meeting", "project"],
  education: ["school", "college", "university", "degree", "exam", "class", "teacher", "student", "graduation", "study", "course"],
  finance: ["money", "finance", "bank", "savings", "investment", "loan", "mortgage", "salary", "budget", "tax"],
  travel: ["travel", "trip", "holiday", "vacation", "flight", "hotel", "beach", "abroad", "journey", "tour", "cruise"],
  milestones: ["milestone", "wedding", "married", "marriage", "engagement", "graduation", "retirement", "anniversary", "newborn", "birth", "achievement", "first"],
  childhood: ["childhood", "child", "kid", "young", "growing up", "playground", "toy"],
  relationships: ["relationship", "partner", "spouse", "husband", "wife", "girlfriend", "boyfriend", "date", "love", "romance"],
  preferences: ["favourite", "favorite", "prefer", "like", "dislike", "hobby", "interest", "taste"],
  emergency: ["emergency", "urgent", "accident", "crisis", "911", "999", "ambulance", "critical", "danger", "fire"],
  routine: ["routine", "daily", "everyday", "chore", "errand", "groceries", "commute", "habit"],
  miscellaneous: [],
};

/** Direct alias mapping: a normalised ai_category that IS (or clearly is) a taxonomy category. */
const DIRECT_ALIASES: Readonly<Record<string, MemoryCategory>> = {
  general: "miscellaneous",
  misc: "miscellaneous",
  other: "miscellaneous",
  health: "health",
  medical: "medical",
  family: "family",
  friends: "friends",
  friend: "friends",
  career: "career",
  work: "career",
  education: "education",
  finance: "finance",
  travel: "travel",
  milestone: "milestones",
  milestones: "milestones",
  childhood: "childhood",
  relationship: "relationships",
  relationships: "relationships",
  preference: "preferences",
  preferences: "preferences",
  emergency: "emergency",
  routine: "routine",
};

function norm(s: string | null | undefined): string {
  return (s ?? "").toLowerCase().trim();
}

/** Classify a memory into the controlled taxonomy. Deterministic; safe to cache. */
export function classifyMemory(input: MemoryIntelligenceInput): MemoryClassification {
  const aiCat = norm(input.aiCategory);

  // 1. Direct alias on the enriched ai_category (highest confidence).
  if (aiCat && DIRECT_ALIASES[aiCat]) {
    return finalize(DIRECT_ALIASES[aiCat], 0.95);
  }
  if (aiCat && (MEMORY_CATEGORIES as readonly string[]).includes(aiCat)) {
    return finalize(aiCat as MemoryCategory, 0.95);
  }

  // 2. Keyword scan over ai_category + title + content + tags.
  const haystack = [
    aiCat,
    norm(input.title),
    norm(input.content),
    ...(Array.isArray(input.aiTags) ? input.aiTags.map(norm) : []),
  ]
    .filter(Boolean)
    .join(" ");

  let best: MemoryCategory = "miscellaneous";
  let bestHits = 0;
  for (const category of MEMORY_CATEGORIES) {
    let hits = 0;
    for (const kw of CATEGORY_KEYWORDS[category]) {
      if (kw && haystack.includes(kw)) hits++;
    }
    // Emergency + medical win EXACT non-zero ties (safety-relevant). The bias is applied ONLY when the
    // category actually matched keywords — otherwise a keyword-LESS memory must fall through to
    // "miscellaneous" (never be silently promoted to a protected "medical" class).
    const biased =
      hits > 0 ? hits + (category === "emergency" || category === "medical" ? 0.5 : 0) : 0;
    if (biased > bestHits) {
      bestHits = biased;
      best = category;
    }
  }

  const confidence = bestHits === 0 ? 0.3 : clamp01(0.5 + Math.min(0.4, bestHits * 0.15));
  return finalize(best, confidence);
}

function finalize(category: MemoryCategory, confidence: number): MemoryClassification {
  return {
    category,
    protectedFromDecay: DECAY_CONFIG.neverDecayCategories.includes(category),
    slowDecay: DECAY_CONFIG.slowDecayCategories.includes(category),
    confidence: clamp01(confidence),
  };
}
