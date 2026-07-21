import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { userCanAccessProfile } from "@/lib/profile-ownership";
import {
  getTogetherMoments,
  getTogetherTime,
} from "@/lib/together-time/queries";
import MomentPlayer from "@/components/together-time/MomentPlayer";
import TogetherTimeActions from "@/components/together-time/TogetherTimeActions";

export const metadata: Metadata = { title: "Together Time" };
export const dynamic = "force-dynamic";

/**
 * The Together Time player page. READ authorization against the set's OWN
 * context (a read-only caregiver can run a set — the hub-ordering bump is
 * best-effort and silently skipped for them); moments are fetched re-scoped
 * by the same workspace with signed media. Deleted memories drop out calmly.
 */
export default async function TogetherTimePage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const set = await getTogetherTime(params.id);
  const authorized =
    !!set &&
    (set.memory_profile_id == null
      ? set.user_id === user.id
      : await userCanAccessProfile(user.id, set.memory_profile_id));

  if (!set || !authorized) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-8">
        <Link
          href="/activities/family"
          className="inline-flex min-h-11 items-center gap-1.5 rounded-full text-sm font-medium text-charcoal-soft transition hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Family Activities
        </Link>
        <div className="mt-6 rounded-3xl border border-sand-deep/70 bg-white p-8 text-center shadow-soft">
          <p className="text-charcoal-soft">
            This together time isn&apos;t available.
          </p>
          <p className="mt-1 text-sm text-charcoal-muted">
            It may have been removed, or it belongs to a different workspace.
          </p>
        </div>
      </div>
    );
  }

  const moments = await getTogetherMoments(set);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <Link
        href="/activities/family"
        className="inline-flex min-h-11 items-center gap-1.5 rounded-full text-sm font-medium text-charcoal-soft transition hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Family Activities
      </Link>

      <header className="mt-4">
        <h1 className="font-serif text-2xl font-semibold text-charcoal md:text-3xl">
          {set.title || "Together time"}
        </h1>
        <p className="mt-1 text-sm text-charcoal-muted">
          Take it one moment at a time — there&apos;s no rush.
        </p>
      </header>

      <div className="mt-4">
        <TogetherTimeActions togetherTimeId={set.id} />
      </div>

      {moments.length > 0 ? (
        <MomentPlayer togetherTimeId={set.id} moments={moments} />
      ) : (
        <div className="mt-6 rounded-3xl border border-sand-deep/70 bg-white p-8 text-center shadow-soft">
          <p className="text-charcoal-soft">
            The memories in this together time are no longer available.
          </p>
          <p className="mt-1 text-sm text-charcoal-muted">
            They may have been deleted from the workspace. You can edit this
            set or create a new one.
          </p>
        </div>
      )}
    </div>
  );
}
