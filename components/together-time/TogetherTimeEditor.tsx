"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { haptic, hapticSuccess } from "@/lib/haptics";
import {
  TOGETHER_MIN_MOMENTS,
  TOGETHER_TITLE_MAX,
} from "@/lib/together-time/types";
import { updateTogetherTime } from "@/app/(app)/activities/family/actions";
import MomentOrderList, {
  type MomentListItem,
} from "@/components/stories/MomentOrderList";

/** Edit a set: optional title + order/removal (floor of 3) via the shared list. */
export default function TogetherTimeEditor({
  togetherTimeId,
  initialTitle,
  initialMoments,
}: {
  togetherTimeId: string;
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
    setAnnounce("Removed from this together time.");
    void haptic("light");
  }, []);

  const onSave = useCallback(async () => {
    if (saving) return;
    setSaving(true);
    setError("");
    void haptic("medium");
    const result = await updateTogetherTime({
      togetherTimeId,
      title,
      memoryIds: moments.map((m) => m.id),
    });
    if (result.ok) {
      void hapticSuccess();
      router.push(`/activities/family/${togetherTimeId}`);
      return;
    }
    setSaving(false);
    setError("We couldn't save your changes. Please try again.");
  }, [saving, togetherTimeId, title, moments, router]);

  const canSave = moments.length >= TOGETHER_MIN_MOMENTS && !saving;

  return (
    <section className="mt-6 space-y-5">
      <p role="status" aria-live="polite" className="sr-only">
        {announce}
      </p>

      {error && (
        <p role="alert" className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-600">
          {error}
        </p>
      )}

      <div>
        <label
          htmlFor="edit-together-title"
          className="block text-sm font-medium text-charcoal-soft"
        >
          Title <span className="text-charcoal-muted">(optional)</span>
        </label>
        <input
          id="edit-together-title"
          type="text"
          value={title}
          maxLength={TOGETHER_TITLE_MAX}
          onChange={(e) => setTitle(e.target.value)}
          className="mt-1 w-full rounded-xl border border-sand-deep px-4 py-3 text-base text-charcoal outline-none transition placeholder:text-charcoal-muted focus:border-sage focus:ring-2 focus:ring-sage/40"
        />
      </div>

      <MomentOrderList
        items={moments}
        onMove={move}
        onRemove={moments.length > TOGETHER_MIN_MOMENTS ? remove : undefined}
      />

      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          disabled={!canSave}
          onClick={() => void onSave()}
          aria-busy={saving || undefined}
          className="flex min-h-11 flex-1 items-center justify-center rounded-full bg-sage px-6 py-3 font-semibold text-white shadow-soft transition hover:bg-sage-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage focus-visible:ring-offset-2 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
        <Link
          href={`/activities/family/${togetherTimeId}`}
          className="flex min-h-11 items-center justify-center rounded-full border border-sand-deep/70 bg-white px-6 py-3 font-semibold text-charcoal transition hover:bg-sand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage"
        >
          Cancel
        </Link>
      </div>
    </section>
  );
}
