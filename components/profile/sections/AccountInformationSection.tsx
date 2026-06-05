"use client";

import { useState } from "react";

interface AccountInformationSectionProps {
  email: string;
  firstName: string;
  preferredName: string;
}

/**
 * Account Information (Phase 1).
 *
 * Displays the authenticated email (read-only) and lets the user edit their
 * first name and preferred name. Persists via PATCH /api/profile, which updates
 * the caller's own `profiles` row (RLS-scoped). Avatar editing is out of scope
 * (no avatar column exists yet).
 */
export default function AccountInformationSection({
  email,
  firstName,
  preferredName,
}: AccountInformationSectionProps) {
  const [first, setFirst] = useState(firstName);
  const [preferred, setPreferred] = useState(preferredName);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");
  const [message, setMessage] = useState("");

  const dirty = first !== firstName || preferred !== preferredName;

  async function handleSave() {
    setSaving(true);
    setStatus("idle");
    setMessage("");

    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: first.trim(),
          preferredName: preferred.trim(),
        }),
      });

      if (!res.ok) {
        throw new Error("Save failed");
      }

      setStatus("saved");
      setMessage("Your changes have been saved.");
    } catch {
      setStatus("error");
      setMessage("Something went wrong saving your changes. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4 text-sm">
      <div className="rounded-lg border p-3">
        <label className="block text-xs font-medium text-neutral-500">
          Email
        </label>
        <p className="mt-1 break-all">{email || "—"}</p>
        <p className="mt-1 text-xs text-neutral-400">
          Your email is used to sign in and cannot be changed here.
        </p>
      </div>

      <div className="rounded-lg border p-3 space-y-3">
        <div>
          <label
            htmlFor="account-first-name"
            className="block text-xs font-medium text-neutral-500"
          >
            First name
          </label>
          <input
            id="account-first-name"
            type="text"
            value={first}
            onChange={(e) => setFirst(e.target.value)}
            className="mt-1 w-full rounded-lg border px-3 py-2"
            autoComplete="given-name"
          />
        </div>

        <div>
          <label
            htmlFor="account-preferred-name"
            className="block text-xs font-medium text-neutral-500"
          >
            Preferred name
          </label>
          <input
            id="account-preferred-name"
            type="text"
            value={preferred}
            onChange={(e) => setPreferred(e.target.value)}
            className="mt-1 w-full rounded-lg border px-3 py-2"
            autoComplete="nickname"
          />
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !dirty}
          className="rounded-lg bg-black px-4 py-2 text-white disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save changes"}
        </button>

        {status !== "idle" && (
          <p
            className={
              status === "saved" ? "text-green-600" : "text-red-600"
            }
            role={status === "error" ? "alert" : undefined}
          >
            {message}
          </p>
        )}
      </div>
    </div>
  );
}
