import { extractAskQuery, type AskIntent } from "@/lib/remy/ask-intent";
import type { MemoryRecord } from "@/lib/remy/retrieval";

/**
 * Ask Remy — CONVERSATIONAL INSIGHTS (Phase 4.1). Pure, deterministic structuring of an answer
 * from the memories the Retrieval Engine ALREADY fetched. It makes a Remy reply feel like it
 * understood the memories — a factual summary strip, the related memories to open, and grounded
 * follow-up suggestions — with ZERO extra AI calls and ZERO extra database calls (it only reads
 * the records already in hand). Nothing here is inferred beyond what the memories actually record,
 * so it cannot hallucinate.
 */

export interface AskRelatedMemory {
  id: string;
  title: string;
  date: string | null;
}

export interface AskFacts {
  /** People resolved from the query (from the person graph). */
  people: string[];
  /** Frequent categories/tags across the retrieved memories — the recurring themes. */
  themes: string[];
  /** Span of the retrieved memories (calendar years), if dated. */
  fromYear: number | null;
  toYear: number | null;
}

export interface AskInsights {
  facts: AskFacts;
  related: AskRelatedMemory[];
  followUps: string[];
}

const MAX_PEOPLE = 6;
const MAX_THEMES = 4;
const MAX_RELATED = 4;
const MAX_FOLLOWUPS = 4;

function titleOf(record: MemoryRecord): string {
  return record.ai_title || record.title || "Untitled memory";
}

function yearOf(date?: string | null): number | null {
  if (!date) return null;
  const year = new Date(date).getFullYear();
  return Number.isNaN(year) ? null : year;
}

function topByFrequency(counts: Map<string, number>, limit: number): string[] {
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([key]) => key);
}

/** Derive the factual summary strip from the retrieved records + resolved people. Pure. */
export function deriveAskFacts(records: MemoryRecord[], people: string[]): AskFacts {
  const themeCounts = new Map<string, number>();
  let fromYear: number | null = null;
  let toYear: number | null = null;

  for (const record of records) {
    const category = (record.ai_category ?? "").trim();
    if (category) themeCounts.set(category, (themeCounts.get(category) ?? 0) + 1);
    for (const raw of record.ai_tags ?? []) {
      const tag = (raw ?? "").trim();
      if (tag) themeCounts.set(tag, (themeCounts.get(tag) ?? 0) + 1);
    }

    const year = yearOf(record.memory_date);
    if (year != null) {
      fromYear = fromYear == null ? year : Math.min(fromYear, year);
      toYear = toYear == null ? year : Math.max(toYear, year);
    }
  }

  return {
    people: people.slice(0, MAX_PEOPLE),
    themes: topByFrequency(themeCounts, MAX_THEMES),
    fromYear,
    toYear,
  };
}

/** The retrieved memories the user can open directly (memory connections — reuses retrieval). */
export function deriveRelated(records: MemoryRecord[], limit = MAX_RELATED): AskRelatedMemory[] {
  return records.slice(0, limit).map((record) => ({
    id: record.id,
    title: titleOf(record),
    date: record.memory_date ?? null,
  }));
}

/**
 * Grounded follow-up suggestions. Every phrasing is chosen to re-parse cleanly through the
 * existing Ask intent/retrieval (so tapping one runs a real query), and every one references a
 * fact actually present in the retrieved memories — never a fabricated topic.
 */
export function suggestFollowUps(facts: AskFacts, intent: AskIntent): string[] {
  const candidates: string[] = [];
  const person = facts.people[0];

  if (person) candidates.push(`What memories mention ${person}?`);
  if (facts.toYear != null) candidates.push(`Show memories from ${facts.toYear}`);

  const [theme1, theme2] = facts.themes;
  if (theme1) {
    candidates.push(
      intent === "SUMMARY" ? `Show ${theme1} memories` : `Summarise our ${theme1} memories`,
    );
  }
  if (theme2) candidates.push(`Show ${theme2} memories`);

  // Keep ONLY phrasings that actually parse to a runnable memory query, so a chip can never be a
  // dead end (e.g. a stopword-like theme such as "new" would not parse as a category term).
  const runnable = candidates.filter((phrase) => extractAskQuery(phrase) != null);
  return [...new Set(runnable)].slice(0, MAX_FOLLOWUPS);
}

/** One call to structure a grounded answer: facts + related memories + follow-ups. */
export function deriveAskInsights(
  records: MemoryRecord[],
  people: string[],
  intent: AskIntent,
): AskInsights {
  const facts = deriveAskFacts(records, people);
  return {
    facts,
    related: deriveRelated(records),
    followUps: suggestFollowUps(facts, intent),
  };
}
