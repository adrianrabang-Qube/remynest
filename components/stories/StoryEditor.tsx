"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { haptic, hapticSuccess } from "@/lib/haptics";
import {
  STORY_MIN_MOMENTS,
  STORY_TITLE_MAX,
} from "@/lib/stories/types";
import { updateStory } from "@/app/(app)/activities/stories/actions";
import MomentOrderList, {
  type MomentListItem,
} from "@/components/stories/MomentOrderList";

/**
 * Edit a saved story: title + order (+ removing a moment while above the
 * minimum). Same shared MomentOrderList as the wizard — one reorder
 * implementation. Saving goes through updateStory (server re-verifies every
 * memory against the story's own workspace).
 */
export default function StoryEditor({
  storyId,
  initialTitle,
  initialMoments,
}: {
  storyId: string;
  initialTitle: string;
  initialMoments: MomentListItem[];
}) {
  const router = useRouter();
  const [title, setTitle] = useState(initialTitle);
  const [moments, setMoments] = useState(initialMoments);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [announce, setAnnounce] = useState("");

  const move = useCallback((index: number, dir: -1 | 1) => {
    setMoments((prev) => {
      const next = [...prev];
      const j = index + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[index], next[j]] = [next[j], next[index]];
      return next;
    });
    setAnnounce(`Moved to position ${index + 1 + dir}.`);
    void haptic("light");
  }, []);

  const remove = useCallback((index: number) => {
    setMoments((prev) => prev.filter((_, i) => i !== index));
    setAnnounce("Removed from the story.");
    void haptic("light");
  }, []);

  const onSave = useCallback(async () => {
    if (saving) return;
    setSaving(true);
    setError("");
    void haptic("medium");
    const result = await updateStory({
      storyId,
      title,
      memoryIds: moments.map((m) => m.id),
    });
    if (result.ok) {
      void hapticSuccess();
      router.push(`/activities/stories/${storyId}`);
      return;
    }
    setSaving(false);
    setError("We couldn't save your changes. Please check the title and try again.");
  }, [saving, storyId, title, moments, router]);

  const canSave =
    title.trim().length > 0 && moments.length >= STORY_MIN_MOMENTS && !saving;

  return (
    <section className="mt-6 space-y-5">
      <p role="status" aria-live="polite" className="sr-only">
        {announce}
      </p>

      {error && (
        <p
          role="alert"
          className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-600"
        >
          {error}
        </p>
      )}

      <div>
        <label
          htmlFor="edit-story-title"
          className="block text-sm font-medium text-charcoal-soft"
        >
          Story title
        </label>
        <input
          id="edit-story-title"
          type="text"
          value={title}
          maxLength={STORY_TITLE_MAX}
          onChange={(e) => setTitle(e.target.value)}
          className="mt-1 w-full rounded-xl border border-sand-deep px-4 py-3 text-base text-charcoal outline-none transition placeholder:text-charcoal-muted focus:border-primary focus:ring-2 focus:ring-primary/40"
        />
      </div>

      <MomentOrderList
        items={moments}
        onMove={move}
        onRemove={moments.length > STORY_MIN_MOMENTS ? remove : undefined}
      />

      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          disabled={!canSave}
          onClick={() => void onSave()}
          aria-busy={saving || undefined}
          className="flex min-h-11 flex-1 items-center justify-center rounded-full bg-primary px-6 py-3 font-semibold text-white shadow-soft transition hover:bg-primary-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
        <Link
          href={`/activities/stories/${storyId}`}
          className="flex min-h-11 items-center justify-center rounded-full border border-sand-deep/70 bg-white px-6 py-3 font-semibold text-charcoal transition hover:bg-sand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          Cancel
        </Link>
      </div>
    </section>
  );
}
