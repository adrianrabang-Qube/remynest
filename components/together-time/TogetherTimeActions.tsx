"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";

import { deleteTogetherTime } from "@/app/(app)/activities/family/actions";

/** Set controls: Edit + Delete (accessible confirm; memories always kept). */
export default function TogetherTimeActions({ togetherTimeId }: { togetherTimeId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const onDelete = useCallback(async () => {
    if (busy) return;
    if (
      !window.confirm(
        "Delete this together time? The memories in it are kept — only this set is removed.",
      )
    ) {
      return;
    }
    setBusy(true);
    const res = await deleteTogetherTime(togetherTimeId);
    if (res.ok) router.push("/activities/family");
    else setBusy(false);
  }, [busy, togetherTimeId, router]);

  return (
    <div className="flex items-center gap-2">
      <Link
        href={`/activities/family/${togetherTimeId}/edit`}
        className="flex min-h-11 items-center justify-center gap-2 rounded-full border border-sand-deep/70 bg-white px-5 py-2.5 text-sm font-semibold text-charcoal transition hover:bg-sand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage"
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
