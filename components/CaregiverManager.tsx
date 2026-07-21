"use client";

import { useEffect, useState } from "react";

import {
  listProfileCaregivers,
  revokeCaregiver,
  type CaregiverSummary,
} from "@/app/(app)/dashboard/actions";

interface CaregiverManagerProps {
  memoryProfileId: string;
  profileName: string | null;
}

/**
 * Owner-only caregiver list + revoke, for the WorkspaceSelector "Manage care profiles"
 * panel. Loads accepted caregivers via listProfileCaregivers (owner-authorized) and removes
 * access via revokeCaregiver — both structured server actions that never throw. Renders
 * NOTHING for non-owners (the server action returns an error), so a caregiver viewing a
 * shared profile sees no management UI. Revocation is intentionally available regardless of
 * plan, so a downgraded owner can still reclaim access. Presentation follows Polaris.
 */
export default function CaregiverManager({
  memoryProfileId,
  profileName,
}: CaregiverManagerProps) {
  const [status, setStatus] = useState<"loading" | "ready" | "hidden">(
    "loading",
  );
  const [caregivers, setCaregivers] = useState<CaregiverSummary[]>([]);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    // State is only set AFTER the await — never synchronously in the effect body.
    (async () => {
      const res = await listProfileCaregivers(memoryProfileId);
      if (cancelled) return;
      if ("error" in res) {
        setStatus("hidden"); // not the owner (or load failed) → show nothing
        return;
      }
      setCaregivers(res.caregivers);
      setStatus("ready");
    })();
    return () => {
      cancelled = true;
    };
  }, [memoryProfileId]);

  async function handleRemove(caregiver: CaregiverSummary) {
    setMessage("");
    setBusyId(caregiver.caregiverAccountId);
    const res = await revokeCaregiver({
      memoryProfileId,
      caregiverAccountId: caregiver.caregiverAccountId,
    });
    setBusyId(null);
    setConfirmingId(null);
    if ("error" in res) {
      setMessage(res.error);
      return;
    }
    setCaregivers((prev) =>
      prev.filter(
        (c) => c.caregiverAccountId !== caregiver.caregiverAccountId,
      ),
    );
    setMessage(`Removed ${caregiver.name}'s access.`);
  }

  // Non-owner or load failure → render nothing (invite + add-person still show).
  if (status === "hidden") return null;

  return (
    <div>
      <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-charcoal-muted">
        Caregivers with access
      </p>

      {status === "loading" ? (
        <div
          className="space-y-2"
          aria-busy="true"
          aria-label="Loading caregivers"
        >
          {[0, 1].map((i) => (
            <div
              key={i}
              className="h-14 w-full animate-pulse rounded-2xl bg-sand-deep/20 motion-reduce:animate-none"
            />
          ))}
        </div>
      ) : caregivers.length === 0 ? (
        <p className="rounded-2xl border border-sand-deep/60 bg-white px-4 py-3 text-sm text-charcoal-muted">
          No caregivers have access yet.
        </p>
      ) : (
        <ul className="divide-y divide-sand-deep/40 overflow-hidden rounded-2xl border border-sand-deep/60 bg-white">
          {caregivers.map((c) => {
            const confirming = confirmingId === c.caregiverAccountId;
            const busy = busyId === c.caregiverAccountId;
            return (
              <li key={c.caregiverAccountId} className="p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-charcoal">
                      {c.name}
                    </p>
                    {c.email && (
                      <p className="truncate text-xs text-charcoal-muted">
                        {c.email}
                      </p>
                    )}
                    {c.accessLevel && (
                      <span className="mt-1 inline-flex rounded-full bg-sand px-2 py-0.5 text-[11px] font-medium capitalize text-charcoal-soft">
                        {c.accessLevel}
                      </span>
                    )}
                  </div>

                  {!confirming ? (
                    <button
                      type="button"
                      onClick={() => {
                        setMessage("");
                        setConfirmingId(c.caregiverAccountId);
                      }}
                      className="inline-flex min-h-11 shrink-0 items-center rounded-full border border-rose-200 px-4 text-xs font-medium text-rose-600 transition hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-600"
                    >
                      Remove
                    </button>
                  ) : (
                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleRemove(c)}
                        disabled={busy}
                        className="inline-flex min-h-11 items-center rounded-full bg-rose-600 px-4 text-xs font-semibold text-white transition hover:bg-rose-700 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-600 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                      >
                        {busy ? "Removing…" : "Confirm"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmingId(null)}
                        disabled={busy}
                        className="inline-flex min-h-11 items-center rounded-full border border-sand-deep/60 px-4 text-xs font-medium text-charcoal-soft transition hover:bg-sand/40 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>

                {confirming && !busy && (
                  <p className="mt-2 text-xs text-charcoal-muted">
                    Remove {c.name}&apos;s access to{" "}
                    {profileName ?? "this profile"}? They will lose access to its
                    memories and reminders.
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {message && (
        <p
          className="mt-2 px-2 text-sm text-charcoal-soft"
          role="status"
          aria-live="polite"
        >
          {message}
        </p>
      )}
    </div>
  );
}
