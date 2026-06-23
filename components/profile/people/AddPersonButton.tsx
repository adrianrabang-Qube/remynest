"use client";

import { useState } from "react";

import CreateProfileForm from "@/components/CreateProfileForm";

/**
 * Inline "Add a person" action for the People (/profiles) surface — opens the existing
 * person-creation flow (CreateProfileForm) in a lightweight modal, so the empty state
 * is actionable in place (no redirect to the buried workspace menu). On success the
 * form refreshes the list and the modal closes.
 */
export default function AddPersonButton({
  label = "Add a Person",
}: {
  label?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-full bg-sage px-5 py-2.5 text-sm font-semibold text-white shadow-soft transition hover:bg-sage-deep"
      >
        {label}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Add a person"
        >
          <div className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <CreateProfileForm onSuccess={() => setOpen(false)} />
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="mt-3 w-full text-center text-sm text-charcoal-muted transition hover:text-charcoal"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  );
}
