"use client";

import { useState } from "react";

import ReportDialog from "@/components/moderation/ReportDialog";
import {
  reportUser,
  blockUser,
  unblockUser,
  leaveWorkspace,
  type SafetyPerson,
  type LeavableWorkspace,
} from "@/app/(app)/settings/safety/actions";
import type { ReportReason } from "@/lib/moderation/config";

/**
 * LA5.1 — Safety Center (Apple 1.2). The in-app hub to report or block the people
 * you share care with, and to leave a care workspace. NOT a social surface — it only
 * lists the accounts you're already connected to via care sharing, with safety
 * controls. All mutations go through structured, never-throw server actions.
 */
export default function SafetyCenter({
  initialPeople,
  initialLeavable,
}: {
  initialPeople: SafetyPerson[];
  initialLeavable: LeavableWorkspace[];
}) {
  const [people, setPeople] = useState<SafetyPerson[]>(initialPeople);
  const [leavable, setLeavable] = useState<LeavableWorkspace[]>(initialLeavable);
  const [reporting, setReporting] = useState<SafetyPerson | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmLeave, setConfirmLeave] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  async function handleBlockToggle(person: SafetyPerson) {
    setMessage("");
    setBusyId(person.accountId);
    const res = person.blocked
      ? await unblockUser({ blockedAccountId: person.accountId })
      : await blockUser({ blockedAccountId: person.accountId });
    setBusyId(null);
    if (!res.ok) {
      setMessage(res.error);
      return;
    }
    setPeople((prev) =>
      prev.map((p) =>
        p.accountId === person.accountId ? { ...p, blocked: !person.blocked } : p,
      ),
    );
    setMessage(
      person.blocked ? `Unblocked ${person.name}.` : `Blocked ${person.name}.`,
    );
  }

  async function handleLeave(ws: LeavableWorkspace) {
    setMessage("");
    setBusyId(ws.memoryProfileId);
    const res = await leaveWorkspace({ memoryProfileId: ws.memoryProfileId });
    setBusyId(null);
    setConfirmLeave(null);
    if (!res.ok) {
      setMessage(res.error);
      return;
    }
    setLeavable((prev) => prev.filter((w) => w.memoryProfileId !== ws.memoryProfileId));
    setMessage(`You've left ${ws.profileName}.`);
  }

  return (
    <div className="space-y-8">
      {/* People you share care with */}
      <section>
        <h2 className="font-serif text-lg font-semibold text-charcoal">
          People you share care with
        </h2>
        <p className="mt-1 text-sm text-charcoal-muted">
          Report or block anyone you share a care workspace with. Reports are private
          and reviewed by our team. Blocking prevents future invitations between your
          accounts; it does not remove existing access — use Remove (owners) or Leave
          (below) for that.
        </p>

        {people.length === 0 ? (
          <p className="mt-4 rounded-2xl border border-sand-deep/60 bg-white px-4 py-3 text-sm text-charcoal-muted">
            You don&apos;t share any care workspaces with other people yet.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-sand-deep/40 overflow-hidden rounded-2xl border border-sand-deep/60 bg-white">
            {people.map((p) => {
              const busy = busyId === p.accountId;
              return (
                <li key={p.accountId} className="flex items-start justify-between gap-3 p-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-charcoal">{p.name}</p>
                    {p.email && (
                      <p className="truncate text-xs text-charcoal-muted">{p.email}</p>
                    )}
                    {p.blocked && (
                      <span className="mt-1 inline-flex rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-medium text-rose-600">
                        Blocked
                      </span>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setMessage("");
                        setReporting(p);
                      }}
                      className="inline-flex min-h-11 items-center rounded-full border border-sand-deep/60 px-4 text-xs font-medium text-charcoal-soft transition hover:bg-sand/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage"
                    >
                      Report
                    </button>
                    <button
                      type="button"
                      onClick={() => handleBlockToggle(p)}
                      disabled={busy}
                      className={`inline-flex min-h-11 items-center rounded-full px-4 text-xs font-medium transition disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 ${
                        p.blocked
                          ? "border border-sand-deep/60 text-charcoal-soft hover:bg-sand/40 focus-visible:ring-sage"
                          : "border border-rose-200 text-rose-600 hover:bg-rose-50 focus-visible:ring-rose-600"
                      }`}
                    >
                      {busy ? "…" : p.blocked ? "Unblock" : "Block"}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Leave a care workspace */}
      {leavable.length > 0 && (
        <section>
          <h2 className="font-serif text-lg font-semibold text-charcoal">
            Leave a care workspace
          </h2>
          <p className="mt-1 text-sm text-charcoal-muted">
            Leaving removes your access to a workspace you were invited to. Memories you
            added there are handled per your account settings; the shared record is
            preserved for the owner.
          </p>
          <ul className="mt-4 divide-y divide-sand-deep/40 overflow-hidden rounded-2xl border border-sand-deep/60 bg-white">
            {leavable.map((ws) => {
              const busy = busyId === ws.memoryProfileId;
              const confirming = confirmLeave === ws.memoryProfileId;
              return (
                <li key={ws.memoryProfileId} className="p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="truncate text-sm font-medium text-charcoal">
                      {ws.profileName}
                    </p>
                    {!confirming ? (
                      <button
                        type="button"
                        onClick={() => {
                          setMessage("");
                          setConfirmLeave(ws.memoryProfileId);
                        }}
                        className="inline-flex min-h-11 shrink-0 items-center rounded-full border border-rose-200 px-4 text-xs font-medium text-rose-600 transition hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-600"
                      >
                        Leave
                      </button>
                    ) : (
                      <div className="flex shrink-0 items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleLeave(ws)}
                          disabled={busy}
                          className="inline-flex min-h-11 items-center rounded-full bg-rose-600 px-4 text-xs font-semibold text-white transition hover:bg-rose-700 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-600 focus-visible:ring-offset-2"
                        >
                          {busy ? "Leaving…" : "Confirm"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmLeave(null)}
                          disabled={busy}
                          className="inline-flex min-h-11 items-center rounded-full border border-sand-deep/60 px-4 text-xs font-medium text-charcoal-soft transition hover:bg-sand/40 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {message && (
        <p className="text-sm text-charcoal-soft" role="status" aria-live="polite">
          {message}
        </p>
      )}

      {reporting && (
        <ReportDialog
          title={`Report ${reporting.name}`}
          subject={reporting.name}
          onClose={() => setReporting(null)}
          onSubmit={(reason: ReportReason, description: string) =>
            reportUser({
              reportedAccountId: reporting.accountId,
              reason,
              description,
            })
          }
        />
      )}
    </div>
  );
}
