"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface DeletionPlan {
  steps: { stage: string; description: string; count: number }[];
  totals: { rows: number; mediaFiles: number };
  ownership: {
    sharedOwnedProfiles: { profileId: string; profileName: string | null }[];
    crossAuthoredMemories: number;
  };
}

function countFor(plan: DeletionPlan, stage: string) {
  return plan.steps.find((s) => s.stage === stage)?.count ?? 0;
}

export default function DeleteAccountModal({
  onClose,
}: {
  onClose: () => void;
}) {
  const supabase = createClient();

  const [plan, setPlan] = useState<DeletionPlan | null>(null);
  const [loadingPlan, setLoadingPlan] = useState(true);
  const [provider, setProvider] = useState<string>("email");

  const [deleteContributed, setDeleteContributed] = useState(false); // default = retain
  const [password, setPassword] = useState("");
  const [typed, setTyped] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase.auth.getUser();
        setProvider(
          (data.user?.app_metadata?.provider as string | undefined) ?? "email",
        );
        const res = await fetch("/api/gdpr/delete-account", { method: "GET" });
        if (res.ok) setPlan(await res.json());
      } catch {
        /* surfaced on submit */
      } finally {
        setLoadingPlan(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isEmail = provider === "email";
  const canSubmit =
    typed.trim().toUpperCase() === "DELETE" &&
    acknowledged &&
    (!isEmail || password.length > 0) &&
    !submitting;

  async function reauthOAuth() {
    await supabase.auth.signInWithOAuth({
      provider: provider as "google" | "apple",
      options: { redirectTo: `${window.location.origin}/settings` },
    });
  }

  async function handleDelete() {
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/gdpr/delete-account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, deleteContributed }),
      });

      if (res.status === 200 || res.status === 202) {
        await supabase.auth.signOut();
        window.location.href = "/login?deleted=1";
        return;
      }

      const data = await res.json().catch(() => ({}));
      if (data.code === "REAUTH_REQUIRED" && !isEmail) {
        await reauthOAuth();
        return;
      }
      setError(data.error ?? "Account deletion failed. Please try again.");
    } catch {
      setError("Account deletion failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between">
          <h3 className="text-lg font-semibold text-red-700">Delete Account</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <p className="mt-2 text-sm text-neutral-600">
          This permanently removes your account and personal data. This action
          cannot be undone.
        </p>

        {/* Summary */}
        <div className="mt-4 rounded-lg border p-3 text-sm">
          {loadingPlan ? (
            <p className="text-neutral-500">Calculating what will be deleted…</p>
          ) : plan ? (
            <>
              <p className="font-medium">You own:</p>
              <ul className="mt-1 list-disc pl-5 text-neutral-600">
                <li>{countFor(plan, "memory_profiles")} memory profiles</li>
                <li>{countFor(plan, "memories")} memories</li>
                <li>{countFor(plan, "reminders")} reminders</li>
                <li>
                  {countFor(plan, "device_registrations")} device registrations
                </li>
                <li>{plan.totals.mediaFiles} uploaded files</li>
              </ul>
              {plan.ownership.sharedOwnedProfiles.length > 0 && (
                <p className="mt-2 text-neutral-600">
                  Shared profiles requiring transfer:{" "}
                  <strong>{plan.ownership.sharedOwnedProfiles.length}</strong>
                </p>
              )}
              {plan.ownership.crossAuthoredMemories > 0 && (
                <p className="mt-1 text-neutral-600">
                  Memories contributed to other profiles:{" "}
                  <strong>{plan.ownership.crossAuthoredMemories}</strong>
                </p>
              )}
            </>
          ) : (
            <p className="text-red-600">Could not load your deletion summary.</p>
          )}
        </div>

        {/* Cross-contributed choice (default = retain) */}
        {plan && plan.ownership.crossAuthoredMemories > 0 && (
          <fieldset className="mt-4 rounded-lg border p-3 text-sm">
            <legend className="px-1 font-medium">
              Memories you contributed to other people&apos;s profiles
            </legend>
            <label className="mt-1 flex items-start gap-2">
              <input
                type="radio"
                name="contrib"
                checked={!deleteContributed}
                onChange={() => setDeleteContributed(false)}
                className="mt-1"
              />
              <span>
                <strong>Keep them</strong> (remove my identity). Preserves the
                care record; authorship is anonymised.
              </span>
            </label>
            <label className="mt-2 flex items-start gap-2">
              <input
                type="radio"
                name="contrib"
                checked={deleteContributed}
                onChange={() => setDeleteContributed(true)}
                className="mt-1"
              />
              <span>
                <strong>Delete them</strong> permanently from other people&apos;s
                profiles.
              </span>
            </label>
          </fieldset>
        )}

        {/* Re-auth */}
        <div className="mt-4 text-sm">
          {isEmail ? (
            <>
              <label
                htmlFor="delete-password"
                className="block font-medium text-neutral-700"
              >
                Confirm your password
              </label>
              <input
                id="delete-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded-lg border px-3 py-2"
                autoComplete="current-password"
              />
            </>
          ) : (
            <p className="text-neutral-600">
              You may be asked to sign in again to confirm this action.
            </p>
          )}
        </div>

        {/* Typed confirmation + acknowledgement */}
        <div className="mt-4 text-sm">
          <label htmlFor="delete-typed" className="block text-neutral-700">
            Type <span className="font-mono font-semibold">DELETE</span> to
            confirm
          </label>
          <input
            id="delete-typed"
            type="text"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            className="mt-1 w-full rounded-lg border px-3 py-2"
            autoComplete="off"
          />
          <label className="mt-3 flex items-start gap-2">
            <input
              type="checkbox"
              checked={acknowledged}
              onChange={(e) => setAcknowledged(e.target.checked)}
              className="mt-1"
            />
            <span>I understand this action cannot be undone.</span>
          </label>
        </div>

        {error && (
          <p className="mt-3 text-sm text-red-600" role="alert">
            {error}
          </p>
        )}

        <div className="mt-5 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border px-4 py-2 text-sm"
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={!canSubmit}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm text-white disabled:opacity-50"
          >
            {submitting ? "Deleting…" : "Delete Account"}
          </button>
        </div>
      </div>
    </div>
  );
}
