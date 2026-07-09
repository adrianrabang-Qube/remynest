/**
 * Remy Platform (v2) — MEMORY UNDERSTANDING ENGINE (pure).
 *
 * Transforms every REAL stored memory into a structured semantic understanding — themes, life
 * stage, importance, richness, relationships, time span, confidence — derived DETERMINISTICALLY
 * from the memory's own metadata. This is NOT GPT and produces NO prose / NO fabricated facts:
 * every field comes from real signals already on the memory (category, date, people, attachments,
 * AI importance, historical flag). Sits at the FRONT of the relationship pipeline (right after the
 * snapshot); it is INTERNAL — not shown in the UI — and is the input for current + future engines.
 * PURE: no React/DOM/Supabase/fetch/timers/localStorage; the caller supplies all data.
 */
import type {
  DatedMemory,
  LifeStage,
  MemoryImportance,
  MemoryRelationship,
  MemoryTheme,
  MemoryUnderstanding,
} from "./family-types";

export interface UnderstandingContext {
  /** person id → corpus mention count, used only to choose the primary person. Optional. */
  personImportance?: ReadonlyMap<string, number>;
}

const THEME_KEYWORDS: { theme: MemoryTheme; keys: string[] }[] = [
  { theme: "celebration", keys: ["celebrat", "birthday", "wedding", "anniversary", "party", "christmas"] },
  { theme: "travel", keys: ["travel", "holiday", "trip", "vacation", "journey"] },
  { theme: "achievement", keys: ["achiev", "graduat", "award", "success", "milestone"] },
  { theme: "health", keys: ["health", "medical", "hospital", "illness", "recovery"] },
  { theme: "education", keys: ["school", "universit", "college", "educat", "student", "class"] },
  { theme: "work", keys: ["work", "job", "career", "office", "business"] },
  { theme: "pets", keys: ["pet", "dog", "cat", "animal"] },
  { theme: "home", keys: ["home", "house", "moving", "garden"] },
  { theme: "care", keys: ["caregiv", "carer", "care"] },
  { theme: "relationships", keys: ["relationship", "partner", "marriage", "romance"] },
  { theme: "friendship", keys: ["friend"] },
  { theme: "family", keys: ["family", "parent", "child", "grand"] },
];

const LIFE_STAGE_KEYWORDS: { stage: LifeStage; keys: string[] }[] = [
  { stage: "childhood", keys: ["childhood", "baby", "infant", "born", "nursery"] },
  { stage: "teen-years", keys: ["teen", "high school", "adolescen"] },
  { stage: "early-adult", keys: ["universit", "college", "graduat", "first job"] },
  { stage: "family-life", keys: ["wedding", "marriage", "married", "children", "parent"] },
  { stage: "later-years", keys: ["retire", "grandchild", "grandparent", "senior"] },
];

function normalize(value: string | null): string {
  return (value ?? "").toLowerCase();
}

const clamp100 = (n: number): number => Math.max(0, Math.min(100, Math.round(n)));

/** Themes inferred from the real ai_category (keyword match); "other" when a category has no match. */
function deriveThemes(category: string | null): MemoryTheme[] {
  const c = normalize(category);
  if (!c) return [];
  const found: MemoryTheme[] = [];
  for (const { theme, keys } of THEME_KEYWORDS) {
    if (keys.some((k) => c.includes(k))) found.push(theme);
  }
  return found.length > 0 ? found : ["other"];
}

/**
 * Life stage inferred from real category keywords (there is no birth date to age-map dates, so the
 * only honest source is the category); "unknown" when no keyword matches — never fabricated.
 */
function deriveLifeStage(category: string | null): LifeStage {
  const c = normalize(category);
  if (!c) return "unknown";
  for (const { stage, keys } of LIFE_STAGE_KEYWORDS) {
    if (keys.some((k) => c.includes(k))) return stage;
  }
  return "unknown";
}

/** Importance classified from the memory's own significance signals (people/media/AI/historical). */
function classifyImportance(m: DatedMemory): MemoryImportance {
  const people = m.peopleIds ?? [];
  const score =
    people.length * 4 +
    (m.attachmentCount ?? 0) * 3 +
    Math.max(0, m.importance ?? 0) / 10 +
    (m.historical ? 10 : 0);
  if (score >= 30) return "legacy";
  if (score >= 18) return "major";
  if (score >= 8) return "important";
  return "ordinary";
}

function deriveRelationship(
  m: DatedMemory,
  personImportance?: ReadonlyMap<string, number>,
): MemoryRelationship {
  const people = [...(m.peopleIds ?? [])];
  const participants = people.length;

  let primaryPerson: string | null = null;
  if (participants > 0) {
    primaryPerson = personImportance
      ? people.reduce(
          (best, id) =>
            (personImportance.get(id) ?? 0) > (personImportance.get(best) ?? 0) ? id : best,
          people[0],
        )
      : people[0];
  }
  const secondaryPeople = primaryPerson ? people.filter((id) => id !== primaryPerson) : [];

  return {
    primaryPerson,
    secondaryPeople,
    participants,
    isFamilyMemory: participants >= 2,
    isIndividualMemory: participants <= 1,
  };
}

/** How many of the 6 real signals backed this understanding (0–100). */
function deriveConfidence(m: DatedMemory): number {
  let signals = 0;
  if (m.dateIso) signals += 1;
  if (m.category) signals += 1;
  if ((m.peopleIds ?? []).length > 0) signals += 1;
  if ((m.attachmentCount ?? 0) > 0) signals += 1;
  if ((m.importance ?? 0) > 0) signals += 1;
  if (m.historical) signals += 1;
  return clamp100((signals / 6) * 100);
}

function yearOf(dateIso: string): number {
  const d = new Date(dateIso);
  return Number.isNaN(d.getTime()) ? 0 : d.getFullYear();
}

function understandMemory(
  m: DatedMemory,
  personImportance?: ReadonlyMap<string, number>,
): MemoryUnderstanding {
  return {
    id: m.id,
    timeSpan: { dateIso: m.dateIso, year: yearOf(m.dateIso), precision: m.precision },
    historical: Boolean(m.historical),
    lifeStage: deriveLifeStage(m.category),
    themes: deriveThemes(m.category),
    dominantCategories: m.category ? [m.category] : [],
    eventType: m.category,
    importance: classifyImportance(m),
    attachmentRichness: m.attachmentCount ?? 0,
    emotionalRichness: clamp100(m.importance ?? 0),
    relationshipRichness: clamp100((m.peopleIds ?? []).length * 25),
    relationship: deriveRelationship(m, personImportance),
    confidence: deriveConfidence(m),
  };
}

/** Transform every memory into its structured understanding (deterministic; real-data-only). */
export function buildMemoryUnderstanding(
  memories: DatedMemory[],
  context?: UnderstandingContext,
): MemoryUnderstanding[] {
  const personImportance = context?.personImportance;
  return memories.map((m) => understandMemory(m, personImportance));
}
