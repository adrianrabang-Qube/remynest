import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { createClient } from "@/utils/supabase/server";
import RemyStoryConversation from "@/components/remy/RemyStoryConversation";

export const dynamic = "force-dynamic";

/**
 * /remy/story — the opt-in "Remy narrates your story" surface (Phase 25). It is the FIRST user-facing
 * invocation of the conversation execution path: an explicit tap runs the deterministic pipeline + the
 * production provider (server-side, in `narrateStoryConversation`) and renders the narrated text. Isolated
 * from the live Ask Remy chat and the app-open path.
 */
export default async function RemyStoryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_completed")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile?.onboarding_completed) redirect("/onboarding");

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4 p-4 md:space-y-5 md:p-6">
      <Link
        href="/remy"
        className="inline-flex items-center gap-1 text-sm font-medium text-charcoal-muted transition hover:text-charcoal"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden />
        Remy
      </Link>

      <header>
        <h1 className="font-serif text-2xl text-charcoal md:text-3xl">Your Story</h1>
        <p className="mt-1 text-sm text-charcoal-muted">
          Let Remy reflect on the memories you&apos;ve gathered and tell them back to you.
        </p>
      </header>

      <RemyStoryConversation />
    </div>
  );
}
