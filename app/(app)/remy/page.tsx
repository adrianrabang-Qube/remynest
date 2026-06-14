import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { createClient } from "@/utils/supabase/server";
import { buildRemyHomeModel } from "@/lib/remy/home-model";
import { buildRemyConversation } from "@/lib/remy/conversation";
import { REMY } from "@/lib/remy/persona";

import RemyConversation from "@/components/remy/RemyConversation";

export const dynamic = "force-dynamic";

/**
 * Remy (/remy) — the dedicated companion experience. A pure presentation layer
 * over the shared home model (buildRemyHomeModel) + a deterministic conversation
 * composition (buildRemyConversation). No new intelligence, no new query types,
 * no AI — it reuses the exact loaders Home uses.
 */
export default async function RemyConversationPage() {
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

  const model = await buildRemyHomeModel(supabase, user.id);
  const conversation = buildRemyConversation({
    understanding: model.understanding,
    voiceLines: model.voiceLines,
    briefing: model.briefing,
  });

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4 p-4 md:space-y-5 md:p-6">
      <Link
        href="/home"
        className="inline-flex items-center gap-1 text-sm font-medium text-charcoal-muted transition hover:text-charcoal"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden />
        Home
      </Link>

      <header>
        <h1 className="text-xl font-semibold text-charcoal md:text-2xl">
          {REMY.name}
        </h1>
        <p className="mt-0.5 text-sm text-charcoal-muted">
          A conversation with your memory companion
          {model.subjectName ? ` about ${model.subjectName}` : ""}.
        </p>
      </header>

      <RemyConversation conversation={conversation} />
    </div>
  );
}
