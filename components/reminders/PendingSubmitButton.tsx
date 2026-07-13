"use client";

import { useFormStatus } from "react-dom";
import type { ReactNode } from "react";

/**
 * Submit button that disables itself while its parent form's server action is
 * pending — the UI-layer guard against DOUBLE-TAP duplicate mutations.
 *
 * QA-verified defect (2026-07-13) this fixes, WITHOUT touching the frozen
 * reminder scheduling/action logic: React queues same-form server-action
 * submissions sequentially, and `nextOccurrenceAfter` intentionally always
 * advances at least one cadence step — so a double-tap on a recurring
 * reminder's "Done for today" advanced the series TWICE (a daily medication
 * reminder silently jumped two days), and a double-tap on "Create Reminder"
 * created duplicate reminders (duplicate iOS notifications). Disabling while
 * pending blocks the second dispatch (a disabled default submit also blocks
 * implicit Enter-key resubmission).
 *
 * Must be rendered INSIDE the <form> it guards (useFormStatus reads the
 * nearest form's status). Presentation + dispatch-guard only — the server
 * actions, form fields, and form-reset `key` are untouched.
 */
export default function PendingSubmitButton({
  className,
  children,
  "aria-label": ariaLabel,
}: {
  className?: string;
  children: ReactNode;
  "aria-label"?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending || undefined}
      aria-label={ariaLabel}
      className={`${className ?? ""} disabled:pointer-events-none disabled:opacity-60`.trim()}
    >
      {children}
    </button>
  );
}
