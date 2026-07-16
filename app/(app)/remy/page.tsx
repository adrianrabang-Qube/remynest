import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";

import { createClient } from "@/utils/supabase/server";
import { buildRemyHomeModel } from "@/lib/remy/home-model";
import { buildRemyConversation } from "@/lib/remy/conversation";
import { buildRemyActions } from "@/lib/remy/actions";
import { buildRemyJourneys } from "@/lib/remy/journeys";
import { buildRemyCoach } from "@/lib/remy/coach";
import { buildRemyAsk } from "@/lib/remy/ask";
import { REMY } from "@/lib/remy/persona";

import Remy from "@/components/remy/Remy";
import RemyConversation from "@/components/remy/RemyConversation";
import RemyActions from "@/components/remy/RemyActions";
import RemyJourneys from "@/components/remy/RemyJourneys";
import RemyCoach from "@/components/remy/RemyCoach";
import RemyAsk from "@/components/remy/RemyAsk";

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
  const actions = buildRemyActions({
    voiceLines: model.voiceLines,
    briefing: model.briefing,
    // The conversation already renders its featured CTA — don't duplicate it.
    excludeHref: conversation.featuredCTA?.href,
  });
  const journeys = buildRemyJourneys({
    story: model.story,
    lifeJourney: model.lifeJourney,
    understanding: model.understanding,
  });
  const coach = buildRemyCoach({
    coverage: model.coverage,
    lifeJourney: model.lifeJourney,
    story: model.story,
  });
  const ask = buildRemyAsk();

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4 p-4 md:space-y-5 md:p-6">
      <Link
        href="/home"
        className="inline-flex items-center gap-1 text-sm font-medium text-charcoal-muted transition hover:text-charcoal"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden />
        Home
      </Link>

      {/* Warm Remy presence (V1) — the companion greets the page through the single <Remy>
          renderer; avatar tier at this compact size. */}
      <header className="flex items-center gap-3">
        <Remy state="welcome" assetVariant="avatar" size={56} decorative />
        <div className="min-w-0">
          <h1 className="font-serif text-xl font-semibold text-charcoal md:text-2xl">
            {REMY.name}
          </h1>
          <p className="mt-0.5 text-sm text-charcoal-muted">
            A conversation with your memory companion
            {model.subjectName ? ` about ${model.subjectName}` : ""}.
          </p>
        </div>
      </header>

      {/* Opt-in: let Remy narrate the saved memories into a flowing reflection (AI, on explicit tap). */}
      <Link
        href="/remy/story"
        className="flex items-center gap-3 rounded-3xl border border-charcoal/10 bg-white/70 p-4 shadow-soft transition hover:bg-sand/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-sage focus-visible:ring-offset-2"
      >
        <span
          aria-hidden
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-sage/10 text-sage-deep"
        >
          <Sparkles className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-serif text-base text-charcoal">Your story, told by Remy</span>
          <span className="block text-sm text-charcoal-muted">
            A warm reflection woven from the memories you&apos;ve saved.
          </span>
        </span>
        <ChevronRight className="h-5 w-5 shrink-0 text-charcoal-muted" aria-hidden />
      </Link>

      <RemyConversation conversation={conversation} />

      {/* Structured action layer — selection of existing ranked CTAs */}
      <RemyActions actions={actions} />

      {/* Journeys — selection of existing story / life-journey destinations */}
      <RemyJourneys journeys={journeys} />

      {/* Coach — deterministic coverage/maturity health from existing facts */}
      <RemyCoach coach={coach} />

      {/* Ask — deterministic intent router to existing destinations */}
      <RemyAsk ask={ask} />
    </div>
  );
}
