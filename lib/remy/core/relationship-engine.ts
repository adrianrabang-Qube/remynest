/**
 * Remy Platform (v2) — RELATIONSHIP MEMORY ENGINE (pure).
 *
 * The umbrella that turns a `RelationshipSnapshot` (real counts + first-memory date + people +
 * today's anniversaries + favourite person + nest stage + top chapter) into long-term relationship
 * `RelationshipObservation[]` — the warm, "we've built something together" notices, distinct from
 * the immediate companion nudges. PURE: no React/DOM/DB/timers; the caller supplies `today` and all
 * data (anniversaries/favourite/chapter come from the anniversary/favourite/story engines). Every
 * observation names an existing `RemyBehavior` and carries long cooldowns so moments stay special.
 */
import type { RemyBehavior } from "./behavior";
import type { NestStage } from "./nest";
import type {
  Anniversary,
  EmotionalProfile,
  FavouritePerson,
  PersonalityTrait,
  RelationshipObservation,
} from "./family-types";

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

export interface RelationshipSnapshot {
  memoryCount: number;
  firstMemoryDate: string | null;
  nestStage: NestStage;
  acknowledgedStage: NestStage | null;
  daysSinceLastVisit: number | null;
  /** Today's local day key (YYYY-MM-DD), caller-supplied — the engine reads no clock. */
  today: string;
  peopleTotal: number;
  acknowledgedPeopleTotal: number | null;
  topFavourite: FavouritePerson | null;
  acknowledgedFavourites: string[];
  todaysAnniversaries: Anniversary[];
  topChapterTitle: string | null;
  /** Remy's emotional understanding of the family (from the emotional engine) — optional. */
  emotionalProfile?: EmotionalProfile | null;
  /** Behavioural traits (from the personality engine) — optional. */
  personalityTraits?: PersonalityTrait[];
}

export function deriveRelationshipObservations(
  s: RelationshipSnapshot,
): RelationshipObservation[] {
  const out: RelationshipObservation[] = [];

  // Welcome back after time away (relationship-framed).
  if (s.daysSinceLastVisit != null && s.daysSinceLastVisit >= 3) {
    out.push(mk("welcome-back", "It's good to have you back — your memories are right here.", "greeting", 55, 45, 2 * DAY));
  }

  // The anniversary of a specific memory (oldest first — the most meaningful).
  const anniversary = s.todaysAnniversaries[0];
  if (anniversary) {
    out.push(
      mk(
        `anniversary:${anniversary.memoryId}:${anniversary.yearsAgo}`,
        anniversary.yearsAgo === 1
          ? `You added "${anniversary.title}" one year ago today.`
          : `You added "${anniversary.title}" ${anniversary.yearsAgo} years ago today.`,
        "memoryFound",
        78,
        88,
        DAY,
      ),
    );
  }

  // The anniversary of the very first memory (the start of the whole story).
  if (s.firstMemoryDate) {
    const first = new Date(s.firstMemoryDate);
    const today = new Date(s.today);
    if (
      !Number.isNaN(first.getTime()) &&
      !Number.isNaN(today.getTime()) &&
      first.getMonth() === today.getMonth() &&
      first.getDate() === today.getDate() &&
      first.getFullYear() < today.getFullYear()
    ) {
      const years = today.getFullYear() - first.getFullYear();
      out.push(
        mk(
          "first-memory-anniversary",
          years === 1
            ? "One year ago today, you saved your very first memory here."
            : `${years} years ago today, you saved your very first memory here.`,
          "celebrating",
          80,
          90,
          DAY,
        ),
      );
    }
  }

  // A favourite person the family has been remembering a lot.
  if (
    s.topFavourite &&
    s.topFavourite.memoryCount >= 3 &&
    !s.acknowledgedFavourites.includes(s.topFavourite.id)
  ) {
    out.push(
      mk(
        `favourite:${s.topFavourite.id}`,
        `You've spent a lot of time remembering ${s.topFavourite.name} lately.`,
        "listening",
        52,
        40,
        3 * DAY,
      ),
    );
  }

  // A new person appeared in the memories.
  if (s.acknowledgedPeopleTotal != null && s.peopleTotal > s.acknowledgedPeopleTotal) {
    out.push(mk("new-family-member", "Someone new has joined your memories.", "memoryFound", 58, 50, 2 * DAY));
  }

  // A warm reflection on what's been preserved together (rare cadence).
  if (s.memoryCount >= 10) {
    out.push(mk("preserved-together", `We've preserved ${s.memoryCount} memories together.`, "greeting", 40, 25, 7 * DAY));
  }

  // The Nest's highest form — a relationship milestone.
  if (s.nestStage === "sanctuary" && s.acknowledgedStage !== "sanctuary") {
    out.push(mk("sanctuary-reached", "Your Nest has become a Sanctuary.", "celebrating", 70, 60, 30 * DAY));
  }

  // A gentle invitation back to an older chapter of the story.
  if (s.topChapterTitle && s.memoryCount >= 20) {
    out.push(mk("revisit-chapter", `Would you like to revisit ${s.topChapterTitle}?`, "reminder", 44, 30, 5 * DAY));
  }

  // --- Emotional intelligence — significance over quantity (from the emotional engine) ---
  const ep = s.emotionalProfile;
  if (ep) {
    if (ep.mostSignificantMemory && ep.mostSignificantMemory.score >= 40) {
      out.push(
        mk(
          `significant-memory:${ep.mostSignificantMemory.id}`,
          `"${ep.mostSignificantMemory.title}" has become part of your family's story.`,
          "memoryFound",
          68,
          55,
          5 * DAY,
        ),
      );
    }
    if (ep.mostSignificantPerson && ep.mostSignificantPerson.memoryCount >= 4) {
      out.push(
        mk(
          `significant-person:${ep.mostSignificantPerson.id}`,
          `${ep.mostSignificantPerson.name} seems especially important.`,
          "listening",
          60,
          48,
          4 * DAY,
        ),
      );
    }
    if (ep.strongestChapter && ep.strongestChapter.count >= 5) {
      out.push(
        mk(
          `strongest-chapter:${ep.strongestChapter.id}`,
          `${ep.strongestChapter.title} shaped much of your family's history.`,
          "reminder",
          56,
          42,
          6 * DAY,
        ),
      );
    }
    if (ep.mostRevisitedMemory) {
      out.push(
        mk(
          `revisited-memory:${ep.mostRevisitedMemory.id}`,
          "Your family returns to this story often.",
          "memoryFound",
          54,
          40,
          5 * DAY,
        ),
      );
    }
  }

  // A behavioural trait — never a raw score.
  if ((s.personalityTraits ?? []).includes("memory-guardian")) {
    out.push(mk("memory-guardian", "You've carefully protected these memories.", "greeting", 50, 35, 7 * DAY));
  }

  return out;
}

function mk(
  kind: string,
  message: string,
  behavior: RemyBehavior,
  importance: number,
  urgency: number,
  cooldownMs: number,
): RelationshipObservation {
  return { kind, message, behavior, importance, urgency, cooldownMs };
}
