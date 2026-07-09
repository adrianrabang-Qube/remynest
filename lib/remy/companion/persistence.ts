/**
 * Remy Platform (v2) — lightweight client PERSISTENCE (localStorage).
 *
 * The companion remembers a little across sessions — today just the last memory count, so
 * milestone celebrations fire once (on the crossing) and never retroactively. SSR-safe (guards
 * `window`) and failure-tolerant (private-mode / quota errors degrade to "no memory", never throw).
 * Kept tiny + additive; richer state (streaks, last-greeting) plugs in here with no consumer change.
 */
const KEY_LAST_MEMORY_COUNT = "remy.milestones.lastCount";

export function readLastMemoryCount(): number | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY_LAST_MEMORY_COUNT);
    if (raw == null) return null;
    const n = Number.parseInt(raw, 10);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

export function writeLastMemoryCount(count: number): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY_LAST_MEMORY_COUNT, String(count));
  } catch {
    /* private mode / quota — best-effort only */
  }
}

/**
 * Behavioural memory for the Companion Intelligence layer (RemyMoments): the last visit day (so
 * greetings fire once per day + inactivity is measurable), the Nest stage already acknowledged, and
 * a per-observation cooldown ledger (so a moment never repeats / spams). One JSON blob, SSR- and
 * failure-safe.
 */
const KEY_COMPANION_MEMORY = "remy.companion.memory";

export interface CompanionMemory {
  /** Local day key (YYYY-MM-DD) of the last visit, or null. */
  lastVisitDate: string | null;
  /** The Nest stage last shown to the user (to detect a fresh evolution). */
  acknowledgedStage: string | null;
  /** Last-shown timestamp (ms) per observation kind. */
  cooldowns: Record<string, number>;
}

const EMPTY_COMPANION_MEMORY: CompanionMemory = {
  lastVisitDate: null,
  acknowledgedStage: null,
  cooldowns: {},
};

export function readCompanionMemory(): CompanionMemory {
  if (typeof window === "undefined") return { ...EMPTY_COMPANION_MEMORY };
  try {
    const raw = window.localStorage.getItem(KEY_COMPANION_MEMORY);
    if (!raw) return { ...EMPTY_COMPANION_MEMORY };
    const parsed = JSON.parse(raw) as Partial<CompanionMemory>;
    return {
      lastVisitDate: typeof parsed.lastVisitDate === "string" ? parsed.lastVisitDate : null,
      acknowledgedStage:
        typeof parsed.acknowledgedStage === "string" ? parsed.acknowledgedStage : null,
      cooldowns:
        parsed.cooldowns && typeof parsed.cooldowns === "object"
          ? (parsed.cooldowns as Record<string, number>)
          : {},
    };
  } catch {
    return { ...EMPTY_COMPANION_MEMORY };
  }
}

export function writeCompanionMemory(memory: CompanionMemory): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY_COMPANION_MEMORY, JSON.stringify(memory));
  } catch {
    /* private mode / quota — best-effort only */
  }
}

/**
 * Behavioural memory for the Living Relationship System (RemyRelationship): per-kind cooldowns, the
 * acknowledged people total (to notice a new family member), which favourite people / anniversaries
 * / chapters have already been surfaced, revisited memory ids, and a cached favourite-people list.
 * A separate JSON blob (additive; the companion memory above is untouched). SSR- and failure-safe.
 */
const KEY_RELATIONSHIP_MEMORY = "remy.relationship.memory";

export interface RelationshipMemory {
  cooldowns: Record<string, number>;
  acknowledgedPeopleTotal: number | null;
  acknowledgedFavourites: string[];
  acknowledgedAnniversaries: string[];
  acknowledgedChapters: string[];
  visitedMemories: string[];
  favouritePeople: string[];
}

const EMPTY_RELATIONSHIP_MEMORY: RelationshipMemory = {
  cooldowns: {},
  acknowledgedPeopleTotal: null,
  acknowledgedFavourites: [],
  acknowledgedAnniversaries: [],
  acknowledgedChapters: [],
  visitedMemories: [],
  favouritePeople: [],
};

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
}

export function readRelationshipMemory(): RelationshipMemory {
  if (typeof window === "undefined") return cloneRelationshipMemory(EMPTY_RELATIONSHIP_MEMORY);
  try {
    const raw = window.localStorage.getItem(KEY_RELATIONSHIP_MEMORY);
    if (!raw) return cloneRelationshipMemory(EMPTY_RELATIONSHIP_MEMORY);
    const parsed = JSON.parse(raw) as Partial<RelationshipMemory>;
    return {
      cooldowns:
        parsed.cooldowns && typeof parsed.cooldowns === "object"
          ? (parsed.cooldowns as Record<string, number>)
          : {},
      acknowledgedPeopleTotal:
        typeof parsed.acknowledgedPeopleTotal === "number" ? parsed.acknowledgedPeopleTotal : null,
      acknowledgedFavourites: stringArray(parsed.acknowledgedFavourites),
      acknowledgedAnniversaries: stringArray(parsed.acknowledgedAnniversaries),
      acknowledgedChapters: stringArray(parsed.acknowledgedChapters),
      visitedMemories: stringArray(parsed.visitedMemories),
      favouritePeople: stringArray(parsed.favouritePeople),
    };
  } catch {
    return cloneRelationshipMemory(EMPTY_RELATIONSHIP_MEMORY);
  }
}

export function writeRelationshipMemory(memory: RelationshipMemory): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY_RELATIONSHIP_MEMORY, JSON.stringify(memory));
  } catch {
    /* private mode / quota — best-effort only */
  }
}

function cloneRelationshipMemory(memory: RelationshipMemory): RelationshipMemory {
  return {
    ...memory,
    cooldowns: { ...memory.cooldowns },
    acknowledgedFavourites: [...memory.acknowledgedFavourites],
    acknowledgedAnniversaries: [...memory.acknowledgedAnniversaries],
    acknowledgedChapters: [...memory.acknowledgedChapters],
    visitedMemories: [...memory.visitedMemories],
    favouritePeople: [...memory.favouritePeople],
  };
}
