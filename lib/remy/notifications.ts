import type { DateCoverage } from "./date-coverage";
import type { RemyCollection } from "./collections";
import type { RemyConnection } from "./connections";
import type { RemyLifeChapter } from "./life-chapters";
import type { FamilyIntelligence } from "./family";
import { formatCollectionRange } from "./collections";
import { formatChapterRange } from "./life-chapters";

/**
 * Remy Notifications (V1) — the intelligence-driven UPDATES layer.
 *
 *   Memory Intelligence → Notifications → Dashboard / Digest / Push
 *
 * This is NOT push/email/persistence. It is a pure, read-only SYNTHESIZER: it
 * consumes intelligence the Remy systems already produced (Memory Dates,
 * Collections V2, Connections V2, Life Chapters V2, Family Intelligence V1) and
 * ranks it into notification candidates. It performs no queries and duplicates
 * no business logic — Notifications become the single source of truth that
 * future Digest Emails / Push will consume instead of re-deriving intelligence.
 *
 * Best-effort + graceful: every input is optional; missing inputs simply yield
 * fewer notifications.
 */
export type RemyNotificationCategory =
  | "memory-date"
  | "collection"
  | "connection"
  | "chapter"
  | "family";

export interface RemyNotification {
  id: string;
  priority: number;
  title: string;
  message: string;
  category: RemyNotificationCategory;
  href: string;
  createdAt: string;
}

// Higher = more prominent. Discovery/growth above reminders.
const PRIORITY = {
  CHAPTER: 90,
  FAMILY_SHARED: 85,
  COLLECTION: 80,
  CONNECTION_ERA: 72,
  CONNECTION: 65,
  FAMILY_ACTIVE: 55,
  MEMORY_DATE: 40,
} as const;

const MAX_NOTIFICATIONS = 10;

export interface RemyNotificationInput {
  coverage?: DateCoverage | null;
  collections?: RemyCollection[];
  connections?: RemyConnection[];
  chapters?: RemyLifeChapter[];
  family?: FamilyIntelligence | null;
}

export function getRemyNotifications(
  input: RemyNotificationInput
): RemyNotification[] {
  const now = new Date().toISOString();
  const out: RemyNotification[] = [];

  // ── Life Chapter — highest (a new period of life is the most notable) ──────
  const chapter = (input.chapters ?? [])[0];
  if (chapter && chapter.memoryCount > 0) {
    const range = formatChapterRange(chapter);
    out.push({
      id: `chapter-${chapter.id}`,
      priority: PRIORITY.CHAPTER,
      title: `${chapter.title} is becoming a chapter`,
      message: `${chapter.memoryCount} ${
        chapter.memoryCount === 1 ? "memory" : "memories"
      } now belong to this period${range ? `, ${range}` : ""}.`,
      category: "chapter",
      href: `/chapters/${chapter.id}`,
      createdAt: chapter.lastActiveAt ?? now,
    });
  }

  // ── Family — shared theme (high) + most-active member (medium) ─────────────
  if (input.family) {
    const shared = input.family.observations.find(
      (o) => o.id === "family-shared-theme"
    );
    if (shared) {
      out.push({
        id: "family-shared-theme",
        priority: PRIORITY.FAMILY_SHARED,
        title: "A shared family theme",
        message: shared.text,
        category: "family",
        href: "/dashboard",
        createdAt: now,
      });
    }
    const active = input.family.observations.find(
      (o) => o.id === "family-active"
    );
    if (active) {
      out.push({
        id: "family-active",
        priority: PRIORITY.FAMILY_ACTIVE,
        title: "Family activity",
        message: active.text,
        category: "family",
        href: "/dashboard",
        createdAt: now,
      });
    }
  }

  // ── Collection — largest theme (significant collection growth) ─────────────
  const collection = (input.collections ?? [])[0];
  if (collection && collection.memoryCount >= 3) {
    out.push({
      id: `collection-${collection.id}`,
      priority: PRIORITY.COLLECTION,
      title: `${collection.title} is your largest collection`,
      message: `${collection.memoryCount} ${
        collection.memoryCount === 1 ? "memory" : "memories"
      } gathered under this theme${
        formatCollectionRange(collection)
          ? ` · ${formatCollectionRange(collection)}`
          : ""
      }.`,
      category: "collection",
      href: `/collections/${collection.id}`,
      createdAt: collection.lastActiveAt ?? now,
    });
  }

  // ── Connection — a meaningful, diverse story ───────────────────────────────
  const connection = (input.connections ?? []).find(
    (c) => c.diversityScore > 0
  );
  if (connection) {
    out.push({
      id: `connection-${connection.id}`,
      priority: connection.spansEras
        ? PRIORITY.CONNECTION_ERA
        : PRIORITY.CONNECTION,
      title: "Remy found a connected story",
      message: connection.summary,
      category: "connection",
      href: `/connections/${connection.id}`,
      createdAt: connection.lastActiveAt ?? now,
    });
  }

  // ── Memory dates — lower-priority adoption reminder ────────────────────────
  if (
    input.coverage &&
    input.coverage.total > 0 &&
    input.coverage.percentage < 50
  ) {
    out.push({
      id: "memory-date-coverage",
      priority: PRIORITY.MEMORY_DATE,
      title: "Most memories still need dates",
      message: `Only ${input.coverage.percentage}% of memories have dates so far — adding them helps Remy understand each story.`,
      category: "memory-date",
      href: "/memory-dates",
      createdAt: now,
    });
  }

  return out
    .sort((a, b) => b.priority - a.priority)
    .slice(0, MAX_NOTIFICATIONS);
}
