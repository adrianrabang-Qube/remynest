/**
 * Remy Companion Foundation — shared types.
 *
 * Remy is the AI companion layer that sits above the Dashboard, Memories,
 * Reminders, Insights, and Caregiver workflows. It is NOT a chatbot: it turns
 * existing data into calm, supportive observations.
 *
 * The engine (signals → observations) is deliberately decoupled from the
 * presence (observations → UI). `mood` is the forward-compatible seam: the
 * future animated/3D avatar reads it to choose an expression without any change
 * to the observation engine.
 */

/** The surface a companion is rendered on (lets one engine serve many places). */
export type RemySurface =
  | "dashboard"
  | "memories"
  | "reminders"
  | "insights"
  | "caregiver";

/** Emotional colouring of an observation — drives copy styling + avatar mood. */
export type RemyTone =
  | "celebratory"
  | "encouraging"
  | "informative"
  | "gentle"
  | "reassuring";

/** Avatar expression hint (future avatar plug-in reads this). */
export type RemyMood = "happy" | "calm" | "thoughtful" | "attentive";

export interface RemyObservation {
  /** Stable id so observations can be diffed/animated/dismissed later. */
  id: string;
  surface: RemySurface;
  tone: RemyTone;
  mood: RemyMood;
  /** Higher = more prominent. The companion shows the top-ranked first. */
  priority: number;
  /** Remy's voice — calm, human, never robotic. */
  text: string;
  cta?: { label: string; href: string };
}

/** Read-only, pre-aggregated signals derived from existing data. */
export interface RemySignals {
  /** Care recipient's name in care context; null → first-person ("You"). */
  subjectName: string | null;
  isCareContext: boolean;
  memories: {
    total: number;
    addedThisWeek: number;
    addedThisMonth: number;
    addedLastMonth: number;
    lastAddedAt: string | null;
  };
  reminders: {
    today: number;
    overdue: number;
    upcomingToday: number;
    completedToday: number;
    routines: number;
  };
  workspace: {
    pendingInvites: number;
    accessibleProfiles: number;
  };
  /**
   * Deeper, read-only workspace intelligence (dashboard only). Optional so
   * lighter surfaces (e.g. Insights) can omit it. Every field is derived from
   * existing stored data — never inferred or hallucinated.
   */
  intelligence?: RemyIntelligence;
}

export interface RemyIntelligence {
  /** Memories explicitly dated to the past (memory_date set). */
  historicalTotal: number;
  /** Historical memories preserved (recorded) in the last 7 days. */
  historicalThisWeek: number;
  /** Single shared decade of this week's historical memories, e.g. "1980s". */
  historicalThisWeekEra: string | null;
  /** Most frequent (non-generic) memory category, with its count. */
  topCategory: { label: string; count: number } | null;
  /** Dominant theme among the most recently preserved memories. */
  recentTheme: string | null;
  /** Earliest memory_date year — how far the timeline reaches back. */
  earliestYear: number | null;
  /** Memory clusters Remy has discovered (user-scoped, best-effort). */
  clustersDiscovered: number;
}

/**
 * Remy Activity — the evidence layer behind Remy's observations ("what Remy
 * noticed"), NOT a raw event log. Each item is fully human-readable; internal
 * system language never reaches this type. Designed to later feed notifications,
 * digest emails, push summaries, and family-workspace updates.
 */
export type RemyActivityKind =
  | "historical-preserved"
  | "memory-added"
  | "memory-date-added"
  | "reminder-completed"
  | "collection-discovered";

export interface RemyActivity {
  /** Stable id (kind + source row id) so the feed can diff/animate later. */
  id: string;
  kind: RemyActivityKind;
  /** Human icon (emoji) — never an internal status code. */
  icon: string;
  /** Human title, e.g. "Historical memory preserved". */
  title: string;
  /** Secondary human detail, e.g. "July 4, 1980" or a memory title. */
  description: string;
  /** ISO instant the activity happened (rendered relative client-side). */
  timestamp: string;
  /** Optional deep link to the underlying surface. */
  href?: string;
}
