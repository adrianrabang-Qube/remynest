"use client";

import { useState } from "react";
import DeleteAccountModal from "@/components/profile/DeleteAccountModal";

/**
 * Delete Account (danger zone). Opens the full deletion flow modal.
 */
export default function DeleteAccountSection() {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm">
      <h5 className="font-semibold text-rose-700">Delete Account</h5>
      <p className="mt-1 text-rose-700/80">
        This action permanently removes your account and personal data.
      </p>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-3 inline-flex min-h-11 items-center rounded-full bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-600 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
      >
        Delete Account
      </button>

      {open && <DeleteAccountModal onClose={() => setOpen(false)} />}
    </div>
  );
}
