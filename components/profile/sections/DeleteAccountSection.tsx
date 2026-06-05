"use client";

import { useState } from "react";
import DeleteAccountModal from "@/components/profile/DeleteAccountModal";

/**
 * Delete Account (danger zone). Opens the full deletion flow modal.
 */
export default function DeleteAccountSection() {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm">
      <h5 className="font-semibold text-red-700">Delete Account</h5>
      <p className="mt-1 text-red-700/80">
        This action permanently removes your account and personal data.
      </p>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-3 rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700"
      >
        Delete Account
      </button>

      {open && <DeleteAccountModal onClose={() => setOpen(false)} />}
    </div>
  );
}
