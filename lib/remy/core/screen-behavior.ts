/**
 * Remy Platform (v2) — SCREEN BEHAVIOUR (pure route → reaction map).
 *
 * Makes Remy AWARE of where the user is: each screen maps to the semantic event Remy reacts to on
 * arrival (a brief, non-intrusive floating reaction that then settles). This is the ONE place the
 * mapping lives, so a single `RemyScreenAwareness` surface (mounted in the app shell) drives it —
 * no per-screen edits, no duplicated logic.
 *
 * Screens that already publish their own richer events are deliberately OMITTED so Remy never
 * double-reacts: `/memories` + `/memories/new` (memory.* events), `/search` (search.* events),
 * `/remy` (conversation.* + Ask Remy), `/home` (the provider's session greeting).
 */
import type { RemyEventName } from "./events";

const SCREEN_RULES: { test: (pathname: string) => boolean; event: RemyEventName }[] = [
  { test: (p) => p.startsWith("/timeline"), event: "screen.timeline" },
  { test: (p) => p.startsWith("/profiles"), event: "screen.people" },
  { test: (p) => p.startsWith("/library"), event: "screen.library" },
  { test: (p) => p.startsWith("/reminders"), event: "screen.reminders" },
  { test: (p) => p.startsWith("/settings"), event: "screen.settings" },
  { test: (p) => p.startsWith("/memory-dates") || p.startsWith("/dates"), event: "screen.dates" },
  { test: (p) => p.startsWith("/dashboard"), event: "screen.dashboard" },
];

/** The arrival event for a route, or null if the screen publishes its own reactions (or none). */
export function screenEventForPath(pathname: string): RemyEventName | null {
  for (const rule of SCREEN_RULES) {
    if (rule.test(pathname)) return rule.event;
  }
  return null;
}
