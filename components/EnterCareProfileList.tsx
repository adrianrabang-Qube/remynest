"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { setActiveProfile } from "@/app/(app)/dashboard/profile-actions";

interface CareProfileOption {
  id: string;
  profile_name?: string | null;
  preferred_name?: string | null;
}

/**
 * My Nest → Care entry. Renders accessible care profiles with an "Enter
 * Workspace" action that calls the existing setActiveProfile server action,
 * which writes the authoritative `remynest-active-context` cookie. This is the
 * entry path that was missing (ProfileSwitcher only renders once already in care).
 */
export default function EnterCareProfileList({
  profiles,
}: {
  profiles: CareProfileOption[];
}) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!profiles.length) {
    return null;
  }

  function enter(id: string) {
    setPendingId(id);
    startTransition(() => {
      void setActiveProfile(id)
        .then(() => router.refresh())
        .finally(() => setPendingId(null));
    });
  }

  return (
    <section className="rounded-xl border bg-card p-5">
      <h2 className="text-lg font-semibold">Care Profiles</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Enter a care workspace to view and add that person&apos;s memories.
      </p>

      <ul className="mt-4 space-y-2">
        {profiles.map((p) => {
          const name =
            p.preferred_name || p.profile_name || "Care profile";
          const busy = isPending && pendingId === p.id;
          return (
            <li
              key={p.id}
              className="flex items-center justify-between rounded-lg border px-4 py-3"
            >
              <span className="font-medium">{name}</span>
              <button
                type="button"
                onClick={() => enter(p.id)}
                disabled={isPending}
                className="rounded-lg bg-black px-4 py-2 text-sm text-white disabled:opacity-50"
              >
                {busy ? "Entering…" : "Enter Workspace"}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
