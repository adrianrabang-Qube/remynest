"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  setActiveProfile,
  setPersonalWorkspace,
} from "@/app/(app)/dashboard/profile-actions";
import InviteCaregiverForm from "@/components/InviteCaregiverForm";
import CreateProfileForm from "@/components/CreateProfileForm";

export interface WorkspaceOption {
  id: string;
  name: string;
}

interface WorkspaceSelectorProps {
  /** RLS-scoped accessible care profiles (owned + shared). */
  profiles: WorkspaceOption[];
  activeProfileId: string | null;
  isMyNest: boolean;
  activeProfileName: string | null;
}

/**
 * Global Workspace Selector — a first-class, always-visible control in the top
 * bar (mobile + desktop). Switches between "My Nest" and any accessible care
 * profile from EVERY authenticated screen, and hosts care-profile management
 * (invite caregiver, add a person) — the capability that previously lived in
 * the Dashboard's profile cards.
 *
 * It reuses the existing, permission-guarded server actions (`setActiveProfile`
 * runs `validateProfileId`; both `revalidatePath('/', 'layout')`), so switching
 * updates global context, refreshes all data, and persists via the
 * `remynest-active-context` cookie — with no change to permission/ownership logic.
 */
export default function WorkspaceSelector({
  profiles,
  activeProfileId,
  isMyNest,
  activeProfileName,
}: WorkspaceSelectorProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const currentLabel = isMyNest
    ? "My Nest"
    : activeProfileName ?? "Care workspace";

  // Escape to close + lock background scroll while the sheet is open.
  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  function switchTo(action: () => Promise<unknown>) {
    startTransition(() => {
      void Promise.resolve(action()).then(() => {
        router.refresh();
        setOpen(false);
      });
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="inline-flex max-w-[11rem] items-center gap-1.5 rounded-full border border-sand-deep/70 bg-white/70 px-3 py-1.5 text-sm font-medium text-charcoal transition hover:bg-white"
      >
        <span className="truncate">{currentLabel}</span>
        <span className="text-xs text-charcoal-muted">▾</span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50"
          role="dialog"
          aria-modal="true"
          aria-label="Switch workspace"
        >
          <div
            className="absolute inset-0 bg-charcoal/40"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />

          <div className="absolute overflow-y-auto overscroll-contain bg-white shadow-2xl max-md:inset-x-0 max-md:bottom-0 max-md:max-h-[85vh] max-md:rounded-t-3xl max-md:pb-[max(1rem,env(safe-area-inset-bottom))] md:right-4 md:top-16 md:max-h-[80vh] md:w-80 md:rounded-2xl">
            <div className="sticky top-0 flex items-center justify-between border-b border-sand-deep/60 bg-white px-4 py-3">
              <span className="text-sm font-semibold text-charcoal">
                Workspace
              </span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="text-xl leading-none text-charcoal-muted hover:text-charcoal"
              >
                ×
              </button>
            </div>

            <ul className="p-2">
              <li>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => switchTo(setPersonalWorkspace)}
                  className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm transition hover:bg-sand/50 disabled:opacity-50"
                >
                  <span className="font-medium text-charcoal">My Nest</span>
                  {isMyNest && (
                    <span aria-hidden className="text-sage">
                      ✓
                    </span>
                  )}
                </button>
              </li>

              {profiles.map((profile) => {
                const active = !isMyNest && profile.id === activeProfileId;
                return (
                  <li key={profile.id}>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => switchTo(() => setActiveProfile(profile.id))}
                      aria-current={active ? "true" : undefined}
                      className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm transition hover:bg-sand/50 disabled:opacity-50"
                    >
                      <span className="truncate text-charcoal">
                        {profile.name}
                      </span>
                      {active && (
                        <span aria-hidden className="text-sage">
                          ✓
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>

            <div className="border-t border-sand-deep/60 p-2">
              <button
                type="button"
                onClick={() => setManageOpen((value) => !value)}
                aria-expanded={manageOpen}
                className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm font-medium text-sage-deep transition hover:bg-sand/50"
              >
                Manage care profiles
                <span className="text-xs">{manageOpen ? "▴" : "▾"}</span>
              </button>

              {manageOpen && (
                <div className="space-y-5 px-1 py-3">
                  {!isMyNest && activeProfileId && (
                    <div>
                      <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-charcoal-muted">
                        Invite to {activeProfileName}
                      </p>
                      <InviteCaregiverForm memoryProfileId={activeProfileId} />
                    </div>
                  )}
                  <div>
                    <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-charcoal-muted">
                      Add a person
                    </p>
                    <CreateProfileForm />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
