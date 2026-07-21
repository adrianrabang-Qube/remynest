"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";

import { deleteStory } from "@/app/(app)/activities/stories/actions";

/**
 * Reader controls: Edit (title/order) + Delete. Delete uses the app's
 * keyboard/screen-reader-accessible confirm convention and removes ONLY the
 * story view — the memories and media are always kept (and the confirm says so).
 */
export default function StoryActions({ storyId }: { storyId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const onDelete = useCallback(async () => {
    if (busy) return;
    if (
      !window.confirm(
        "Delete this story? The memories inside it are kept — only the story is removed.",
      )
    ) {
      return;
    }
    setBusy(true);
    const res = await deleteStory(storyId);
    if (res.ok) router.push("/activities/stories");
    else setBusy(false);
  }, [busy, storyId, router]);

  return (
    <div className="flex items-center gap-2">
      <Link
        href={`/activities/stories/${storyId}/edit`}
        className="flex min-h-11 items-center justify-center gap-2 rounded-full border border-sand-deep/70 bg-white px-5 py-2.5 text-sm font-semibold text-charcoal transition hover:bg-sand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <Pencil className="h-4 w-4" aria-hidden />
        Edit
      </Link>
      <button
        type="button"
        onClick={() => void onDelete()}
        disabled={busy}
        className="flex min-h-11 items-center justify-center gap-2 rounded-full bg-rose-50 px-5 py-2.5 text-sm font-semibold text-rose-600/90 transition hover:bg-rose-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-600 disabled:opacity-50"
      >
        <Trash2 className="h-4 w-4" aria-hidden />
        Delete
      </button>
    </div>
  );
}
