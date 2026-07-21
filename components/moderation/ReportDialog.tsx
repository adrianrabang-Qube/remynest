"use client";

import { useRef, useState } from "react";

import ModalShell from "@/components/storage/ModalShell";
import { useFocusTrap } from "@/lib/a11y/use-focus-trap";
import {
  REPORT_REASONS,
  MAX_REPORT_DESCRIPTION,
  REPORT_ACTION_WINDOW_HOURS,
  type ReportReason,
} from "@/lib/moderation/config";
import type { ModerationResult } from "@/app/(app)/settings/safety/actions";

/**
 * LA5.1 — the shared Report dialog (Apple 1.2). Used to report either a user or a
 * piece of shared content: the caller passes an `onSubmit` bound to the right server
 * action. Portaled + focus-trapped + scroll-locked (repo modal conventions). Reports
 * are private — the reporter's identity is never shown to the reported person.
 */
export default function ReportDialog({
  title,
  subject,
  onClose,
  onSubmit,
}: {
  title: string;
  /** Human label for what's being reported (a name, or "this memory"). */
  subject: string;
  onClose: () => void;
  onSubmit: (reason: ReportReason, description: string) => Promise<ModerationResult>;
}) {
  const [reason, setReason] = useState<ReportReason | "">("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<false | "submitted" | "already">(false);
  const containerRef = useRef<HTMLDivElement>(null);
  useFocusTrap(true, onClose, containerRef);

  async function submit() {
    if (!reason) {
      setError("Please choose a reason.");
      return;
    }
    setBusy(true);
    setError("");
    const res = await onSubmit(reason, description);
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setDone(res.already ? "already" : "submitted");
  }

  return (
    <ModalShell label={title} onClose={onClose}>
      <div ref={containerRef} tabIndex={-1}>
        {done ? (
          <div>
            <h2 className="font-serif text-xl font-semibold text-charcoal">
              Thank you
            </h2>
            <p className="mt-2 text-sm text-charcoal-soft" role="status">
              {done === "already"
                ? "You've already reported this, and our team is reviewing it."
                : `Your report has been received. Our team reviews reports and acts on them, typically within ${REPORT_ACTION_WINDOW_HOURS} hours.`}
            </p>
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="inline-flex min-h-11 items-center rounded-full bg-primary px-5 text-sm font-semibold text-white transition hover:bg-primary-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <div>
            <h2 className="font-serif text-xl font-semibold text-charcoal">
              {title}
            </h2>
            <p className="mt-1 text-sm text-charcoal-muted">
              Reporting {subject}. Reports are private — {subject === "this memory" ? "the author" : "they"}{" "}
              will not be told who reported.
            </p>

            <fieldset className="mt-4">
              <legend className="text-sm font-medium text-charcoal">
                Why are you reporting this?
              </legend>
              <div className="mt-2 space-y-1.5">
                {REPORT_REASONS.map((r) => (
                  <label
                    key={r.value}
                    className="flex cursor-pointer items-center gap-3 rounded-xl border border-sand-deep/60 px-3 py-2.5 text-sm text-charcoal transition hover:bg-sand/40 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary"
                  >
                    <input
                      type="radio"
                      name="report-reason"
                      value={r.value}
                      checked={reason === r.value}
                      onChange={() => {
                        setReason(r.value);
                        setError("");
                      }}
                      className="h-4 w-4 accent-sage"
                    />
                    {r.label}
                  </label>
                ))}
              </div>
            </fieldset>

            <label htmlFor="report-description" className="mt-4 block text-sm font-medium text-charcoal">
              Anything else? <span className="font-normal text-charcoal-muted">(optional)</span>
            </label>
            <textarea
              id="report-description"
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, MAX_REPORT_DESCRIPTION))}
              rows={3}
              maxLength={MAX_REPORT_DESCRIPTION}
              placeholder="Add any detail that will help us review this."
              className="mt-1 w-full rounded-xl border border-sand-deep px-3 py-2 text-base text-charcoal outline-none transition placeholder:text-charcoal-muted focus:border-primary focus:ring-2 focus:ring-primary/40"
            />

            {error && (
              <p className="mt-3 text-sm text-rose-600" role="alert">
                {error}
              </p>
            )}

            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={busy}
                className="inline-flex min-h-11 items-center rounded-full border border-sand-deep/60 px-5 text-sm font-medium text-charcoal-soft transition hover:bg-sand/40 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={busy || !reason}
                className="inline-flex min-h-11 items-center rounded-full bg-rose-600 px-5 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-600 focus-visible:ring-offset-2"
              >
                {busy ? "Submitting…" : "Submit report"}
              </button>
            </div>
          </div>
        )}
      </div>
    </ModalShell>
  );
}
