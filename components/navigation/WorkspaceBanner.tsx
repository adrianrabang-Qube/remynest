"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";

import { setPersonalWorkspace } from "@/app/(app)/dashboard/profile-actions";
import {
  setActiveProfileCache,
  invalidateActiveProfileCache,
} from "@/lib/active-profile-cache";

/**
 * Contextual banner shown app-wide while in a Care workspace. Surfaces the active
 * profile and a one-tap return to My Nest (reuses the existing setPersonalWorkspace
 * server action + cookie context).
 */
export function WorkspaceBanner({
  activeProfileName,
}: {
  activeProfileName: string;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [pending, startTransition] = useTransition();

  function switchToMyNest() {
    // Optimistically flip to My Nest (null) so the feed re-scopes instantly — no
    // /api/active-profile cookie re-read race on native iOS (RDAT-002 follow-up).
    setActiveProfileCache(queryClient, null);
    startTransition(() => {
      void setPersonalWorkspace()
        .then(() => router.refresh())
        .catch(() => {
          invalidateActiveProfileCache(queryClient);
          router.refresh();
        });
    });
  }

  return (
    <div className="flex items-center justify-between gap-3 border-b border-amber-200 bg-amber-50 px-6 py-2 text-sm text-amber-800">
      <span>
        You&apos;re in the care workspace for{" "}
        <strong>{activeProfileName}</strong>.
      </span>
      <button
        type="button"
        onClick={switchToMyNest}
        disabled={pending}
        className="font-medium underline underline-offset-2 hover:text-amber-900 disabled:opacity-50"
      >
        {pending ? "Switching…" : "Switch to My Nest"}
      </button>
    </div>
  );
}
