"use client";

import { useEffect, useRef, useState } from "react";

import CreateProfileForm from "@/components/CreateProfileForm";
import { useFocusTrap } from "@/lib/a11y/use-focus-trap";

/**
 * Inline "Add a person" action for the People (/profiles) surface — opens the existing
 * person-creation flow (CreateProfileForm) in a lightweight modal, so the empty state
 * is actionable in place (no redirect to the buried workspace menu). On success the
 * form refreshes the list and the modal closes.
 *
 * Polaris Pass 3: the modal now traps focus, closes on Escape, restores focus, and locks
 * background scroll (shared useFocusTrap hook) — matching the app's other dialogs. The
 * creation flow itself is unchanged.
 */
export default function AddPersonButton({
  label = "Add a Person",
}: {
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const close = () => setOpen(false);

  // Focus trap + Escape-to-close + focus restore (same hook as the nav drawer / Remy sheet).
  useFocusTrap(open, close, panelRef);

  // Lock background scroll while the modal is open.
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-sage px-5 py-2.5 text-[15px] font-semibold text-white shadow-soft transition hover:bg-sage-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage focus-visible:ring-offset-2 focus-visible:ring-offset-sand"
      >
        {label}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-charcoal/40 p-4 sm:items-center"
          onClick={close}
        >
          <div
            ref={panelRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-label="Add a person"
            className="w-full max-w-md focus:outline-none"
            onClick={(e) => e.stopPropagation()}
          >
            <CreateProfileForm onSuccess={close} />
            <button
              type="button"
              onClick={close}
              className="mt-3 w-full rounded-full py-2 text-center text-sm text-charcoal-muted transition hover:text-charcoal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  );
}
