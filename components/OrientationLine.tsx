"use client";

import { useEffect, useState } from "react";

import { resolveTimeOfDay, greetingForTimeOfDay } from "@/lib/remy";

/**
 * LA1 — Reality-orientation anchor.
 *
 * A persistent, prominent "Good morning — Today is Thursday, 11 July" line.
 * Temporal disorientation is a hallmark of dementia; a visible day/date cue is a
 * cornerstone non-pharmacological reality-orientation intervention that lets the
 * person self-check the day (and whether a reminder is for today) and offloads the
 * repeated "what day is it?" question from caregivers.
 *
 * The date is computed CLIENT-SIDE after mount (like the Nest's time-of-day) so the
 * server's clock/locale can't cause a hydration mismatch. Presentation-only — no
 * data, API, schema, or query. Renders nothing until mounted (avoids a wrong SSR date).
 */
export default function OrientationLine() {
  const [label, setLabel] = useState<string | null>(null);

  // Same client-after-mount pattern as the Nest's time-of-day (Nest.tsx): compute via
  // a function indirection so the day/date reflects the LOCAL clock (no SSR mismatch),
  // and refresh across a day-boundary / greeting change while the page stays open.
  useEffect(() => {
    const update = () => {
      const now = new Date();
      const greeting = greetingForTimeOfDay(resolveTimeOfDay(now));
      const date = now.toLocaleDateString(undefined, {
        weekday: "long",
        day: "numeric",
        month: "long",
      });
      setLabel(`${greeting} — today is ${date}`);
    };
    update();
    const timer = setInterval(update, 10 * 60 * 1000);
    return () => clearInterval(timer);
  }, []);

  if (!label) return null;

  return (
    <p
      aria-live="polite"
      className="text-base font-medium text-charcoal md:text-lg"
    >
      {label}
    </p>
  );
}
