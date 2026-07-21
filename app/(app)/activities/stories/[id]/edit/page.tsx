import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { userCanWriteProfile } from "@/lib/profile-ownership";
import { getStory, getStoryMoments } from "@/lib/stories/queries";
import StoryEditor from "@/components/stories/StoryEditor";

export const metadata: Metadata = { title: "Edit story" };
export const dynamic = "force-dynamic";

/**
 * Edit shell: WRITE authorization against the story's own context (a
 * read-only caregiver gets the unavailable card here rather than a failing
 * save later); the editor client handles title/order.
 */
export default async function EditStoryPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const story = await getStory(params.id);
  const authorized =
    !!story &&
    (story.memory_profile_id == null
      ? story.user_id === user.id
      : await userCanWriteProfile(user.id, story.memory_profile_id));

  if (!story || !authorized) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-8">
        <Link
          href="/activities/stories"
          className="inline-flex min-h-11 items-center gap-1.5 rounded-full text-sm font-medium text-charcoal-soft transition hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Story Builder
        </Link>
        <div className="mt-6 rounded-3xl border border-sand-deep/70 bg-white p-8 text-center shadow-soft">
          <p className="text-charcoal-soft">This story can&apos;t be edited.</p>
          <p className="mt-1 text-sm text-charcoal-muted">
            It may have been removed, or your access here is view-only.
          </p>
        </div>
      </div>
    );
  }

  const moments = await getStoryMoments(story);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <Link
        href={`/activities/stories/${story.id}`}
        className="inline-flex min-h-11 items-center gap-1.5 rounded-full text-sm font-medium text-charcoal-soft transition hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Back to the story
      </Link>

      <header className="mt-4">
        <h1 className="font-serif text-2xl font-semibold text-charcoal md:text-3xl">
          Edit story
        </h1>
        <p className="mt-1 text-charcoal-soft">
          Change the title, reorder the moments, or set one aside.
        </p>
      </header>

      <StoryEditor
        storyId={story.id}
        initialTitle={story.title}
        initialMoments={moments.map((m) => ({
          id: m.id,
          title: m.title || m.content.slice(0, 60) || "Untitled moment",
          imageUrl: m.imageUrl,
        }))}
      />
    </div>
  );
}
