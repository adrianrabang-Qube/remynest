import type { LucideIcon } from "lucide-react";
import {
  Puzzle,
  Copy,
  BookOpenText,
  Music,
  Users,
} from "lucide-react";

/**
 * Remy's Activities — ACTIVITY REGISTRY (authoritative, 2026-07-13).
 *
 * THE single source of truth for every activity on the Activities platform.
 * Feature-driven, never hardcoded in pages: the landing page, cards, navigation
 * hints, and future activity routes all read THIS list. Adding an activity is
 * one entry here (+ its route when it becomes available) — no page rewrites.
 *
 * `status` IS the feature flag:
 *  - "available"    → live now; card links to `href` (required for this status).
 *  - "coming-soon"  → announced next; card is non-interactive with a badge.
 *  - "future"       → on the roadmap; quieter card, no timeline promised.
 * Flipping a status is a one-word config change (deploys with the next push —
 * `main` auto-deploys, so status changes are release decisions).
 *
 * POSITIONING RULE (LA1/LA5 de-medicalization — do NOT violate): activities are
 * "gentle ways to spend time with your memories" — relaxing, reminiscence,
 * conversation. NEVER "cognitive training", "brain health", therapy, or any
 * clinical benefit claim, in copy OR store metadata.
 */

export type ActivityStatus = "available" | "coming-soon" | "future";

export interface Activity {
  /** Stable id + route segment under /activities. Never reuse or rename. */
  slug: string;
  title: string;
  /** One calm line on the card. */
  tagline: string;
  /** Fuller sentence for intro/landing surfaces. */
  description: string;
  status: ActivityStatus;
  /** Destination — required when status is "available". */
  href?: string;
  Icon: LucideIcon;
}

export const ACTIVITIES: Activity[] = [
  {
    slug: "puzzles",
    title: "Memory Puzzles",
    tagline: "Piece a favourite photo back together",
    description:
      "Turn a photo from your memories into a relaxing puzzle — no timers, no pressure, just a moment with a picture you love.",
    status: "available",
    href: "/activities/puzzles",
    Icon: Puzzle,
  },
  {
    slug: "memory-match",
    title: "Memory Match",
    tagline: "Find the pairs among your photos",
    description:
      "A gentle matching game made from your own pictures.",
    status: "available",
    href: "/activities/match",
    Icon: Copy,
  },
  {
    slug: "story-builder",
    title: "Story Builder",
    tagline: "Arrange moments into a story",
    description:
      "Put memories in order and watch a story take shape.",
    status: "available",
    href: "/activities/stories",
    Icon: BookOpenText,
  },
  {
    slug: "music-memories",
    title: "Music Memories",
    tagline: "Songs that bring moments back",
    description:
      "The songs of your life — and the memories they hold.",
    status: "available",
    href: "/activities/music",
    Icon: Music,
  },
  {
    slug: "family-activities",
    title: "Family Activities",
    tagline: "Things to do together",
    description:
      "Together Time — look back through a few favourite memories, side by side.",
    status: "available",
    href: "/activities/family",
    Icon: Users,
  },
];

export function getActivity(slug: string): Activity | undefined {
  return ACTIVITIES.find((a) => a.slug === slug);
}

export function availableActivities(): Activity[] {
  return ACTIVITIES.filter((a) => a.status === "available");
}

export function upcomingActivities(): Activity[] {
  return ACTIVITIES.filter((a) => a.status !== "available");
}

/** Badge copy per status — one place, so every surface says the same thing. */
export const ACTIVITY_STATUS_LABEL: Record<
  Exclude<ActivityStatus, "available">,
  string
> = {
  "coming-soon": "Coming soon",
  future: "On the horizon",
};
