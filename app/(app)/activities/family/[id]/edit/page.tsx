import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { userCanWriteProfile } from "@/lib/profile-ownership";
import {
  getTogetherMoments,
  getTogetherTime,
} from "@/lib/together-time/queries";
import TogetherTimeEditor from "@/components/together-time/TogetherTimeEditor";

export const metadata: Metadata = { title: "Edit together time" };
export const dynamic = "force-dynamic";

/** Edit shell: WRITE authorization against the set's own context. */
export default async function EditTogetherTimePage({
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
      : await userCanWriteProfile(user.id, set.memory_profile_id));

  if (!set || !authorized) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-8">
        <Link
          href="/activities/family"
          className="inline-flex min-h-11 items-center gap-1.5 rounded-full text-sm font-medium text-charcoal-soft transition hover:text-sage focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Family Activities
        </Link>
        <div className="mt-6 rounded-3xl border border-sand-deep/70 bg-white p-8 text-center shadow-soft">
          <p className="text-charcoal-soft">
            This together time can&apos;t be edited.
          </p>
          <p className="mt-1 text-sm text-charcoal-muted">
            It may have been removed, or your access here is view-only.
          </p>
        </div>
      </div>
    );
  }

  const moments = await getTogetherMoments(set);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <Link
        href={`/activities/family/${set.id}`}
        className="inline-flex min-h-11 items-center gap-1.5 rounded-full text-sm font-medium text-charcoal-soft transition hover:text-sage focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Back to the together time
      </Link>

      <header className="mt-4">
        <h1 className="font-serif text-2xl font-semibold text-charcoal md:text-3xl">
          Edit together time
        </h1>
        <p className="mt-1 text-charcoal-soft">
          Change the title, reorder the moments, or set one aside.
        </p>
      </header>

      <TogetherTimeEditor
        togetherTimeId={set.id}
        initialTitle={set.title}
        initialMoments={moments.map((m) => ({
          id: m.id,
          title: m.title || m.content.slice(0, 60) || "Untitled moment",
          imageUrl: m.imageUrl,
        }))}
      />
    </div>
  );
}
