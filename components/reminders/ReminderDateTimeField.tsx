"use client";

import { useState } from "react";

/**
 * Timezone-correct reminder time input.
 *
 * `<input type="datetime-local">` yields a naive wall-clock string (e.g.
 * "2026-06-10T14:00") with no timezone. Converting that on the server (Vercel =
 * UTC) misinterprets the user's local pick as UTC. Here we convert in the
 * browser, where `new Date(localString)` interprets the value in the user's own
 * timezone — including DST for that specific date — and `.toISOString()` yields
 * the correct UTC instant. That UTC value is submitted as a hidden field.
 *
 * The visible input still submits `remind_at` (naive local) as a no-JS fallback;
 * the server action prefers `remind_at_utc` when present.
 */
export default function ReminderDateTimeField({
  className,
  required,
}: {
  className?: string;
  required?: boolean;
}) {
  const [utc, setUtc] = useState("");

  return (
    <>
      <input
        type="datetime-local"
        name="remind_at"
        defaultValue=""
        required={required}
        className={className}
        onChange={(e) => {
          const value = e.target.value;
          setUtc(value ? new Date(value).toISOString() : "");
        }}
      />

      <input type="hidden" name="remind_at_utc" value={utc} />
    </>
  );
}
