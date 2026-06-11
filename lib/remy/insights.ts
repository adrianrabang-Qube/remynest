import type { RemyObservation, RemyTone, RemyMood } from "./types";
import { TONE_MOOD, remyVoice, type RemyVoice } from "./persona";
import { generateRemyObservations } from "./observations";
import { deriveRemySignals } from "./signals";

/**
 * Remy Insights Center — turns existing memory + reminder telemetry into a
 * companion insights experience: human observations first, raw numbers kept as
 * supporting context. Pure + read-only; reuses Remy Signals + Observations so
 * the dashboard and Insights speak with one voice.
 *
 * Forward-compatible: Family Engagement and Routine Health are structured to
 * absorb caregiver/profile breakdowns and lifecycle adherence data later.
 */

const DAY_MS = 86_400_000;

const MOOD_SCORES: Record<string, number> = {
  happy: 8,
  excited: 9,
  calm: 7,
  neutral: 5,
  anxious: 3,
  sad: 2,
  stressed: 2,
};

const FAMILY_CATEGORY_HINTS = [
  "family",
  "people",
  "relationship",
  "friend",
  "love",
  "child",
  "parent",
  "partner",
  "grand",
];

export interface InsightMemory {
  id: string;
  created_at: string;
  ai_mood?: string | null;
  ai_category?: string | null;
}

export interface InsightReminder {
  id: string;
  created_at: string;
  completed?: boolean | null;
}

export interface InsightMetric {
  label: string;
  value: string;
}

export interface InsightSection {
  id: string;
  title: string;
  tone: RemyTone;
  mood: RemyMood;
  headline: string;
  detail?: string;
  metrics: InsightMetric[];
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  unlocked: boolean;
}

export interface RemyInsightsModel {
  headline: string;
  summary: RemyObservation[];
  sections: InsightSection[];
  achievements: Achievement[];
  recommendations: RemyObservation[];
}

interface BuildRemyInsightsInput {
  memories: InsightMemory[];
  reminders: InsightReminder[];
  subjectName?: string | null;
  isCareContext?: boolean;
  now?: Date;
}

function relativeDays(iso: string | null, now: Date): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return null;
  return Math.floor((now.getTime() - t) / DAY_MS);
}

function section(
  id: string,
  title: string,
  tone: RemyTone,
  headline: string,
  metrics: InsightMetric[],
  detail?: string
): InsightSection {
  return { id, title, tone, mood: TONE_MOOD[tone], headline, detail, metrics };
}

export function buildRemyInsights(
  input: BuildRemyInsightsInput
): RemyInsightsModel {
  const now = input.now ?? new Date();
  const memories = input.memories ?? [];
  const reminders = input.reminders ?? [];
  const subjectName = input.subjectName ?? null;
  const isCareContext = input.isCareContext ?? false;
  const v = remyVoice(subjectName, isCareContext);

  // ── Reuse Remy Signals + Observations ──────────────────────────────────────
  const signals = deriveRemySignals(memories, {
    subjectName,
    isCareContext,
    now,
  });
  const observations = generateRemyObservations(signals, "insights");

  // ── Windowed memory counts ────────────────────────────────────────────────
  const weekAgo = now.getTime() - 7 * DAY_MS;
  const twoWeeksAgo = now.getTime() - 14 * DAY_MS;
  const monthAgo = now.getTime() - 30 * DAY_MS;

  let thisWeek = 0;
  let lastWeek = 0;
  const categories = new Set<string>();
  let familyMoments = 0;
  let moodSum = 0;
  let moodCount = 0;

  for (const m of memories) {
    const t = new Date(m.created_at).getTime();
    if (!Number.isNaN(t)) {
      if (t >= weekAgo) thisWeek += 1;
      else if (t >= twoWeeksAgo) lastWeek += 1;
    }
    const cat = m.ai_category?.trim().toLowerCase();
    if (cat) {
      categories.add(cat);
      if (FAMILY_CATEGORY_HINTS.some((h) => cat.includes(h))) {
        familyMoments += 1;
      }
    }
    const mood = m.ai_mood?.trim().toLowerCase();
    if (mood && mood in MOOD_SCORES && (Number.isNaN(t) || t >= monthAgo)) {
      moodSum += MOOD_SCORES[mood];
      moodCount += 1;
    }
  }

  const memTotal = signals.memories.total;
  const lastAddedDays = relativeDays(signals.memories.lastAddedAt, now);

  // ── Reminder follow-through ────────────────────────────────────────────────
  const reminderTotal = reminders.length;
  const reminderDone = reminders.filter((r) => r.completed).length;
  const followThrough =
    reminderTotal > 0
      ? Math.round((reminderDone / reminderTotal) * 100)
      : 0;

  const sections: InsightSection[] = [
    memoryHealthSection(v, {
      total: memTotal,
      addedThisWeek: signals.memories.addedThisWeek,
      addedThisMonth: signals.memories.addedThisMonth,
      lastAddedDays,
    }),
    routineHealthSection(v, {
      total: reminderTotal,
      done: reminderDone,
      rate: followThrough,
    }),
    familyEngagementSection({
      familyMoments,
      lifeAreas: categories.size,
      recentlyActive: signals.memories.addedThisMonth > 0,
    }),
    trendsSection({
      thisWeek,
      lastWeek,
      moodAvg: moodCount > 0 ? moodSum / moodCount : null,
    }),
  ];

  const achievements = buildAchievements({
    total: memTotal,
    addedThisWeek: signals.memories.addedThisWeek,
    lifeAreas: categories.size,
    reminderTotal,
    followThrough,
  });

  const recommendations = buildRecommendations(observations, {
    followThrough,
    reminderTotal,
    lifeAreas: categories.size,
    total: memTotal,
  });

  const headline = isCareContext && subjectName
    ? `A gentle look at how ${v.possessive} world is going.`
    : `A gentle look at how things are going.`;

  return {
    headline,
    summary: observations.slice(0, 3),
    sections,
    achievements,
    recommendations,
  };
}

// ---------------------------------------------------------------------------
// Sections
// ---------------------------------------------------------------------------

function memoryHealthSection(
  v: RemyVoice,
  s: {
    total: number;
    addedThisWeek: number;
    addedThisMonth: number;
    lastAddedDays: number | null;
  }
): InsightSection {
  let tone: RemyTone;
  let headline: string;
  let detail: string | undefined;

  if (s.total === 0) {
    tone = "encouraging";
    headline = `${v.subject} ${v.hasHave} no memories yet — this is where the story begins.`;
  } else if (s.addedThisWeek > 0) {
    tone = "encouraging";
    headline = `Memory keeping is active — ${s.addedThisWeek} new this week.`;
    detail = `${s.total} ${s.total === 1 ? "memory" : "memories"} kept in total.`;
  } else if (s.lastAddedDays != null && s.lastAddedDays > 14) {
    tone = "gentle";
    headline = `It's been a little quiet lately.`;
    detail = `The last memory was about ${s.lastAddedDays} days ago — no rush, whenever a moment feels worth keeping.`;
  } else {
    tone = "reassuring";
    headline = `Memory keeping is ticking along steadily.`;
    detail = `${s.total} ${s.total === 1 ? "memory" : "memories"} kept in total.`;
  }

  return section(
    "memory-health",
    "Memory Health",
    tone,
    headline,
    [
      { label: "Total", value: String(s.total) },
      { label: "This week", value: String(s.addedThisWeek) },
      { label: "This month", value: String(s.addedThisMonth) },
    ],
    detail
  );
}

function routineHealthSection(
  v: RemyVoice,
  s: { total: number; done: number; rate: number }
): InsightSection {
  let tone: RemyTone;
  let headline: string;

  if (s.total === 0) {
    tone = "informative";
    headline = `No reminders yet — Remy can help keep gentle routines.`;
  } else if (s.rate >= 80) {
    tone = "celebratory";
    headline = `Strong follow-through — ${s.done} of ${s.total} reminders completed.`;
  } else if (s.rate >= 50) {
    tone = "encouraging";
    headline = `Steady routines — ${s.done} of ${s.total} reminders done.`;
  } else {
    tone = "gentle";
    headline = `A few reminders slipped by — ${s.done} of ${s.total} completed. That's completely okay.`;
  }

  return section(
    "routine-health",
    "Routine Health",
    tone,
    headline,
    [
      { label: "Completed", value: String(s.done) },
      { label: "Total", value: String(s.total) },
      { label: "Follow-through", value: `${s.rate}%` },
    ]
  );
}

function familyEngagementSection(s: {
  familyMoments: number;
  lifeAreas: number;
  recentlyActive: boolean;
}): InsightSection {
  let tone: RemyTone;
  let headline: string;

  if (s.familyMoments > 0) {
    tone = "encouraging";
    headline = `${s.familyMoments} family ${
      s.familyMoments === 1 ? "moment" : "moments"
    } captured across ${s.lifeAreas} ${
      s.lifeAreas === 1 ? "area" : "areas"
    } of life.`;
  } else if (s.lifeAreas > 0) {
    tone = "gentle";
    headline = `Capturing shared family moments helps everyone feel close — there's room to add a few.`;
  } else {
    tone = "informative";
    headline = `Family moments will appear here as memories are added.`;
  }

  return section(
    "family-engagement",
    "Family Engagement",
    tone,
    headline,
    [
      { label: "Family moments", value: String(s.familyMoments) },
      { label: "Life areas", value: String(s.lifeAreas) },
      {
        label: "Active",
        value: s.recentlyActive ? "This month" : "Quiet",
      },
    ]
  );
}

function trendsSection(s: {
  thisWeek: number;
  lastWeek: number;
  moodAvg: number | null;
}): InsightSection {
  const direction =
    s.thisWeek > s.lastWeek
      ? "rising"
      : s.thisWeek < s.lastWeek
        ? "a little quieter"
        : "holding steady";

  const moodLabel =
    s.moodAvg == null
      ? "settling in"
      : s.moodAvg >= 7
        ? "positive"
        : s.moodAvg >= 5
          ? "balanced"
          : "tender";

  const tone: RemyTone =
    s.thisWeek >= s.lastWeek ? "encouraging" : "gentle";

  return section(
    "trends",
    "Trends",
    tone,
    `Activity is ${direction} week over week, and the overall mood has felt ${moodLabel}.`,
    [
      { label: "This week", value: String(s.thisWeek) },
      { label: "Last week", value: String(s.lastWeek) },
      {
        label: "Mood",
        value:
          s.moodAvg == null
            ? "—"
            : moodLabel.charAt(0).toUpperCase() + moodLabel.slice(1),
      },
    ]
  );
}

// ---------------------------------------------------------------------------
// Achievements
// ---------------------------------------------------------------------------

function buildAchievements(s: {
  total: number;
  addedThisWeek: number;
  lifeAreas: number;
  reminderTotal: number;
  followThrough: number;
}): Achievement[] {
  return [
    {
      id: "first-memory",
      title: "First Memory",
      description: "Kept your very first memory.",
      unlocked: s.total >= 1,
    },
    {
      id: "story-builder",
      title: "Story Builder",
      description: "Kept 10 memories.",
      unlocked: s.total >= 10,
    },
    {
      id: "memory-keeper",
      title: "Memory Keeper",
      description: "Kept 50 memories.",
      unlocked: s.total >= 50,
    },
    {
      id: "consistent-week",
      title: "Consistent Week",
      description: "Added 3+ memories in a week.",
      unlocked: s.addedThisWeek >= 3,
    },
    {
      id: "broad-life",
      title: "A Life Well-Rounded",
      description: "Captured 5+ different areas of life.",
      unlocked: s.lifeAreas >= 5,
    },
    {
      id: "routine-rockstar",
      title: "Routine Rockstar",
      description: "80%+ reminder follow-through.",
      unlocked: s.reminderTotal >= 5 && s.followThrough >= 80,
    },
  ];
}

// ---------------------------------------------------------------------------
// Gentle recommendations (reuse engine observations + insight-specific nudges)
// ---------------------------------------------------------------------------

function buildRecommendations(
  observations: RemyObservation[],
  s: {
    followThrough: number;
    reminderTotal: number;
    lifeAreas: number;
    total: number;
  }
): RemyObservation[] {
  const recs: RemyObservation[] = [];
  const seen = new Set<string>();

  const push = (o: RemyObservation) => {
    if (seen.has(o.id)) return;
    seen.add(o.id);
    recs.push(o);
  };

  // Reuse actionable / gentle observations from the shared engine.
  observations
    .filter((o) => o.id !== "presence" && (o.cta || o.tone === "gentle"))
    .forEach(push);

  // Insight-specific gentle nudges.
  if (s.reminderTotal > 0 && s.followThrough < 50) {
    push({
      id: "rec-routines",
      surface: "insights",
      tone: "gentle",
      mood: TONE_MOOD.gentle,
      priority: 48,
      text: `A quick look at reminders could help the day flow more gently.`,
      cta: { label: "Review reminders", href: "/reminders" },
    });
  }

  if (s.total >= 3 && s.lifeAreas <= 2) {
    push({
      id: "rec-variety",
      surface: "insights",
      tone: "encouraging",
      mood: TONE_MOOD.encouraging,
      priority: 42,
      text: `Try capturing a different kind of moment — a place, a person, a feeling.`,
      cta: { label: "Add a memory", href: "/memories/new" },
    });
  }

  return recs.slice(0, 4);
}
