/**
 * Remy Platform (v2) — TIME OF DAY (pure platform data; no React/DOM).
 *
 * A small, additive layer the living surfaces (the Nest) use to make Remy feel present: the
 * ambient lighting and Remy's resting look shift with the local time, and the greeting adapts.
 * Pure + deterministic given a Date — the caller passes the clock (client-computed after mount to
 * stay SSR/hydration-safe). Part of the ONE platform; exported via `@/lib/remy`.
 */
export type TimeOfDay = "morning" | "afternoon" | "evening" | "night";

/** Local-time buckets: morning 05–12, afternoon 12–17, evening 17–21, night 21–05. */
export function resolveTimeOfDay(date: Date): TimeOfDay {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 21) return "evening";
  return "night";
}

/** At night Remy rests (sleeping) in the Nest; during the day it rests awake (calm idle). */
export function isNightTime(timeOfDay: TimeOfDay): boolean {
  return timeOfDay === "night";
}

/** A gentle, time-appropriate greeting Remy offers when the Nest opens. */
export function greetingForTimeOfDay(timeOfDay: TimeOfDay): string {
  switch (timeOfDay) {
    case "morning":
      return "Good morning";
    case "afternoon":
      return "Good afternoon";
    case "evening":
      return "Good evening";
    case "night":
      return "Good evening";
  }
}
