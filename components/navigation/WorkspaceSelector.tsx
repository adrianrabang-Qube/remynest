"use client";

import { useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";

import { setActiveProfile } from "@/app/(app)/dashboard/profile-actions";
import InviteCaregiverForm from "@/components/InviteCaregiverForm";
import CreateProfileForm from "@/components/CreateProfileForm";
import { haptic } from "@/lib/haptics";

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
  const queryClient = useQueryClient();

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
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      // ALWAYS release to the unlocked default. The app sets no inline body
      // overflow except these mutually-exclusive overlays, so restoring "" can
      // never orphan a stale "hidden" (the previous capture-and-restore could,
      // which is what left scrolling stuck after the sheet closed). Runs on
      // every close AND on unmount, so the lock can never outlive the sheet.
      document.body.style.overflow = "";
    };
  }, [open]);

  function switchTo(action: () => Promise<unknown>) {
    void haptic("light"); // acknowledge the workspace switch on native
    // Close the sheet IMMEDIATELY as an urgent update — NOT inside the
    // transition. Previously setOpen(false) ran inside startTransition after
    // router.refresh(), so React deferred the close until the slow force-dynamic
    // SSR refresh resolved (seconds over cellular) — or never, if the action
    // rejected — leaving the user trapped behind the overlay with scrolling
    // locked. Closing first, then refreshing in the background, releases the
    // overlay + scroll-lock instantly and mirrors the dropdown's close-then-act
    // behavior. The .catch guarantees a failed switch can never strand state.
    setOpen(false);
    startTransition(() => {
      void Promise.resolve(action())
        .then(() => {
          // RDAT-002: the cookie changed — re-read the active workspace so the
          // memories feed + on-page search (keyed on ["active-profile"]) re-scope
          // IMMEDIATELY, not only when the page later remounts. router.refresh()
          // updates the server-rendered chrome (label/banner) as before.
          queryClient.invalidateQueries({ queryKey: ["active-profile"] });
          router.refresh();
        })
        .catch(() => router.refresh());
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

      {/* Portal the overlay to <body> so its `fixed inset-0` resolves against the
          WKWebView VIEWPORT, not the backdrop-blur-md header it is mounted inside
          (MobileTopBar.tsx:37 / AppNavbar.tsx:62) — a non-`none` backdrop-filter
          makes that header the containing block for `position:fixed` descendants
          on WebKit, which re-rooted the drawer to the header box and leaked the
          Manage care profiles / Create profile fragments under the status bar on
          Home/My Nest. The portal restores full-screen positioning AND backdrop
          click-trapping. `open` is always false during SSR/initial hydration, so
          createPortal runs only client-side, where document.body exists. */}
      {open &&
        createPortal(
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

          <div className="absolute overflow-y-auto overscroll-contain bg-white shadow-2xl max-lg:inset-x-0 max-lg:bottom-0 max-lg:max-h-[85vh] max-lg:rounded-t-3xl max-lg:pb-[max(1rem,env(safe-area-inset-bottom))] lg:right-4 lg:top-16 lg:max-h-[80vh] lg:w-80 lg:rounded-2xl">
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

            {/* The "My Nest" (personal workspace) switch was retired from this
                drawer — it now lives in the profile dropdown (ProfileHub). This
                drawer keeps care-profile switching + management only. */}
            <ul className="p-2">
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
                    <CreateProfileForm onSuccess={() => setOpen(false)} />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
