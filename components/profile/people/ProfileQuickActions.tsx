"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { BookHeart, Clock, FolderHeart, ScrollText } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { setActiveProfile } from "@/app/(app)/dashboard/profile-actions";

const ACTIONS: { key: string; label: string; href: string; icon: LucideIcon }[] = [
  { key: "memories", label: "Memories", href: "/memories", icon: BookHeart },
  { key: "timeline", label: "Timeline", href: "/timeline", icon: Clock },
  { key: "collections", label: "Collections", href: "/collections", icon: FolderHeart },
  { key: "story", label: "Story", href: "/library/story", icon: ScrollText },
];

/**
 * ProfileQuickActions — jump into this person's memories, timeline, collections
 * or story. Those surfaces render the *active* workspace, so if this profile
 * isn't already active we switch to it first (reusing the existing
 * setActiveProfile server action) before navigating. No new workspace logic.
 */
export default function ProfileQuickActions({
  profileId,
  isActive,
}: {
  profileId: string;
  isActive: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function go(href: string) {
    startTransition(async () => {
      if (!isActive) {
        await setActiveProfile(profileId);
      }
      router.push(href);
      router.refresh();
    });
  }

  return (
    <section aria-label="Quick actions">
      <h2 className="mb-2 text-lg font-semibold text-charcoal">Explore with Remy</h2>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {ACTIONS.map(({ key, label, href, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => go(href)}
            disabled={pending}
            className="flex min-h-[44px] flex-col items-center justify-center gap-1.5 rounded-2xl border border-sand-deep/70 bg-white p-4 text-center shadow-soft transition hover:shadow-soft-lg disabled:opacity-60"
          >
            <Icon className="h-5 w-5 text-sage" aria-hidden />
            <span className="text-sm font-medium text-charcoal">{label}</span>
          </button>
        ))}
      </div>
      {!isActive && (
        <p className="mt-2 px-1 text-xs text-charcoal-muted">
          Opens this person&rsquo;s workspace.
        </p>
      )}
    </section>
  );
}
