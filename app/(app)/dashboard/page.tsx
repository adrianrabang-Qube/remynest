import PendingInvites from "@/components/PendingInvites";

import { createClient } from "@/utils/supabase/server";

import {
  getAccessibleProfiles,
} from "@/lib/profile-access";

import { resolveSubscription } from "@/lib/billing/resolve-subscription";

import {
  getActiveContext,
} from "@/lib/active-profile";

import { redirect } from "next/navigation";

import { unstable_noStore as noStore } from "next/cache";

import {
  formatDisplayName,
} from "./lib/dashboard-formatters";

import {
  logDashboardLoad,
} from "./lib/dashboard-telemetry";

import DashboardHeader from "./components/DashboardHeader";
import DashboardStats from "./components/DashboardStats";
import DashboardAccountStatus from "./components/DashboardAccountStatus";
import DashboardCreateMemory from "./components/DashboardCreateMemory";
import DashboardActiveProfileWarning from "./components/DashboardActiveProfileWarning";
import DashboardTelemetry from "./components/DashboardTelemetry";
import DashboardFocus from "./components/DashboardFocus";
import {
  type FocusReminder,
  deriveDashboardFocus,
} from "@/lib/reminders/focus";
import RemyCompanion from "@/components/remy/RemyCompanion";
import RemyActivityFeed from "@/components/remy/RemyActivityFeed";
import RemyNotifications from "@/components/remy/RemyNotifications";
import { getRemyNotifications } from "@/lib/remy/notifications";
import { remyMoodForContext } from "@/components/remy/avatar/remy-moods";
import RemyTimeline from "@/components/remy/RemyTimeline";
import { getRemyTimeline } from "@/lib/remy/timeline";
import { getRemyStories } from "@/lib/remy/story-mode";
import { getRemyBiography } from "@/lib/remy/biography";
import { getRemyMemoryBook } from "@/lib/remy/memory-book";
import DashboardStoryPreview from "./components/DashboardStoryPreview";
import { buildRemySignals } from "@/lib/remy/signals";
import { generateRemyObservations } from "@/lib/remy/observations";
import {
  fetchRemyActivitySources,
  buildRemyActivities,
} from "@/lib/remy/activities";
import { getRemyCollections } from "@/lib/remy/collections";
import { getRemyConnections } from "@/lib/remy/connections";
import { getRemyLifeChapters } from "@/lib/remy/life-chapters";
import { getFamilyIntelligence } from "@/lib/remy/family";
import FamilyOverview from "@/components/family/FamilyOverview";
import FamilyThemes from "@/components/family/FamilyThemes";
import { computeCoverage } from "@/lib/remy/date-coverage";
import DateCompletionCard from "@/components/memory-dates/DateCompletionCard";
import ReminisceDashboardCard from "@/components/reminisce/ReminisceDashboardCard";
import { buildWorkspaceUnderstanding } from "@/lib/remy/workspace-understanding";
import { deriveStorySignals } from "@/lib/remy/story-signals";
import { fuseObservations } from "@/lib/remy/observation-bridge";
import { observationsToVoiceLines } from "@/lib/remy/voice-engine";
import { remyVoice } from "@/lib/remy/persona";
import RemyHomeSummary from "@/components/remy/RemyHomeSummary";
import RemyVoicePreview from "@/components/remy/RemyVoicePreview";
import Link from "next/link";

import { WorkspaceShell } from "./components/workspace/WorkspaceShell";

type Profile = {
  id: string;
  profile_name?: string | null;
  preferred_name?: string | null;
  shared?: boolean;
  access_level?: string | null;
  is_premium?: boolean;
  subscription_status?: string | null;
  subscription_plan?: string | null;
  onboarding_completed?: boolean;
};

export const dynamic = "force-dynamic";

export default async function DashboardPage() {

  // =====================================
  // REALTIME / DYNAMIC GOVERNANCE
  // =====================================

  noStore();

  const dashboardRequestId =
    crypto.randomUUID();

  function logDashboardStage(
    stage: string,
    metadata?: unknown
  ) {
    console.info(
      `[dashboard-page] ${stage}`,
      metadata || {}
    );
  }

  function logDashboardError(
    stage: string,
    error: unknown
  ) {
    console.error(
      `[dashboard-page] ${stage}`,
      error
    );
  }

  logDashboardStage(
    "dashboard-request-started",
    {
      dashboardRequestId,
    }
  );

  const supabase =
    await createClient();

  let accessibleProfiles: Profile[] = [];

  try {
    accessibleProfiles =
      await getAccessibleProfiles();
  } catch (error) {
    logDashboardError(
      "accessible-profiles-failed",
      error
    );

    accessibleProfiles = [];
  }

  const activeContext =
    await getActiveContext();

  const resolvedActiveProfileId =
    activeContext?.type === "CARE"
      ? activeContext.profileId
      : null;

  const activeProfileId =
    resolvedActiveProfileId ||
    null;

  const isMyNestContext =
    activeContext?.type ===
    "PERSONAL";

  const effectiveActiveProfileId =
    activeProfileId;


  const {
    data: { user },
  } = await supabase.auth.getUser();

  logDashboardStage(
    "dashboard-auth-loaded",
    {
      dashboardRequestId,

      authenticated:
        Boolean(user),
    }
  );

  // =====================================
  // AUTH PROTECTION
  // =====================================

  if (!user) {
    redirect("/login");
  }

  // =====================================
  // FETCH USER PROFILE
  // =====================================

  let profile: Profile | null = null;

  if (user?.id) {

    const {
      data: profileById,
    } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    const {
      data: profileByEmail,
    } = user.email
      ? await supabase
          .from("profiles")
          .select("*")
          .eq("email", user.email)
          .maybeSingle()
      : { data: null };

    const candidates = [
      profileById,
      profileByEmail,
    ].filter(Boolean) as Profile[];

    const premiumProfile =
      candidates.find(
        (candidate) =>
          resolveSubscription(candidate).isPremium
      ) || null;

    profile =
      premiumProfile ||
      profileById ||
      profileByEmail ||
      null;
  }

  // Single authoritative subscription resolution for the whole dashboard.
  const resolvedSubscription = resolveSubscription(profile);

  // =====================================
  // ONBOARDING PROTECTION
  // =====================================

  if (
    !profile?.onboarding_completed
  ) {
    redirect("/onboarding");
  }

  // =====================================
  // GREETING ENGINE
  // =====================================

  const hour =
    new Date().getHours();

  let greeting = "";

  if (hour < 12) {

    greeting =
      "Good morning";

  } else if (hour < 18) {

    greeting =
      "Good afternoon";

  } else {

    greeting =
      "Good evening";
  }

  const displayName =
    formatDisplayName(
      profile?.preferred_name ||
      profile?.profile_name ||
      user?.email?.split("@")[0] ||
      "there"
    );


  // =====================================
  // PENDING INVITES
  // =====================================

  const {
    data: pendingInvites,
    error: pendingInvitesError,
  } = await supabase
    .from("caregiver_invites")
    .select(`
      *,
      memory_profiles (
        id,
        profile_name,
        preferred_name
      )
    `)
    .eq(
      "email",
      user?.email
    )
    .eq(
      "status",
      "pending"
    );

  if (pendingInvitesError) {

    logDashboardError(
      "pending-invites-error",
      {
        dashboardRequestId,

        pendingInvitesError,
      }
    );
  }

  // =====================================
  // ACTIVE PROFILE
  // =====================================

  const activeProfile =
    accessibleProfiles?.find(
      (profile) =>
        profile.id ===
        effectiveActiveProfileId
    ) || null;

  const isMyNestWorkspace =
    isMyNestContext ||
    !effectiveActiveProfileId;

  const workspaceType =
    isMyNestWorkspace
      ? "my-nest"
      : "care";

  // =====================================
  // MEMORY COUNT
  // =====================================

  let memoryCount = 0;

  let memoryCountError:
    | unknown
    | null = null;

  if (isMyNestContext || effectiveActiveProfileId) {
    const memoriesQuery = supabase
      .from("memories")
      .select("*", {
        count: "exact",
        head: true,
      });

    const query = effectiveActiveProfileId
      ? memoriesQuery.eq(
          "memory_profile_id",
          effectiveActiveProfileId
        )
      : memoriesQuery.is(
          "memory_profile_id",
          null
        );

    const {
      count,
      error,
    } = await query;

    memoryCount =
      count || 0;

    memoryCountError =
      error;
  }

  if (memoryCountError) {

    logDashboardError(
      "memory-count-error",
      {
        dashboardRequestId,

        memoryCountError,
      }
    );
  }

  // =====================================
  // REMINDER FOCUS (read-only)
  //   Reminders are care-only; only fetched for an active care profile.
  //   Selects existing columns only (lifecycle `status` is not yet migrated);
  //   the shared Focus model falls back to `completed`. No lifecycle write.
  // =====================================

  let focusReminders: FocusReminder[] = [];

  if (effectiveActiveProfileId) {
    const {
      data: reminderRows,
      error: reminderError,
    } = await supabase
      .from("reminders")
      .select(
        "id, title, remind_at, completed, recurring, frequency, completed_at"
      )
      .eq(
        "memory_profile_id",
        effectiveActiveProfileId
      );

    if (reminderError) {
      logDashboardError(
        "reminder-focus-error",
        {
          dashboardRequestId,
          reminderError,
        }
      );
    } else {
      focusReminders = (reminderRows ||
        []) as FocusReminder[];
    }
  }

  // =====================================
  // REMY COMPANION (read-only, existing data only)
  //   Deterministic observations — NOT a chatbot, no AI call. Signals are
  //   gathered from `memories`/`reminders` only; failures degrade gracefully.
  // =====================================

  const remySubjectName =
    activeProfile?.preferred_name ||
    activeProfile?.profile_name ||
    null;

  const remyReminderSummary =
    deriveDashboardFocus(focusReminders).summary;

  const remySignals = await buildRemySignals(
    supabase,
    {
      memoryProfileId:
        effectiveActiveProfileId,
      totalMemories: memoryCount,
      reminders: {
        today: remyReminderSummary.todayTotal,
        overdue: remyReminderSummary.overdue,
        upcomingToday:
          remyReminderSummary.upcomingToday,
        completedToday:
          remyReminderSummary.completedToday,
        routines:
          remyReminderSummary.routines,
      },
      subjectName: remySubjectName,
      isCareContext: !isMyNestWorkspace,
      pendingInvites:
        pendingInvites?.length ?? 0,
      accessibleProfiles:
        accessibleProfiles.length,
      userId: user.id,
    }
  );

  const remyObservations =
    generateRemyObservations(
      remySignals,
      "dashboard"
    );

  // Remy Activity (evidence layer) — separate from observation generation.
  // Reuses the already-fetched reminders; fetches recent memories + clusters.
  const remyActivitySources =
    await fetchRemyActivitySources(
      supabase,
      {
        memoryProfileId:
          effectiveActiveProfileId,
        userId: user.id,
      }
    );

  const remyActivities =
    buildRemyActivities({
      memories:
        remyActivitySources.memories,
      reminders: focusReminders,
      clusters:
        remyActivitySources.clusters,
    });

  // Remy Collections (top themes; includeDetails gives date ranges, reused by
  // the Timeline to anchor "theme begins appearing" events to a year).
  const remyCollections =
    await getRemyCollections(
      supabase,
      user.id,
      { limit: 4, includeDetails: true }
    );

  // Remy Connections (top stories — anchor title + connected count).
  const remyConnections =
    await getRemyConnections(
      supabase,
      user.id,
      { limit: 4 }
    );

  // Life Chapters (most significant periods — title + range + count).
  const remyLifeChapters =
    await getRemyLifeChapters(
      supabase,
      user.id,
      { sort: "count", limit: 4 }
    );

  // Memory date coverage — reuses existing counts (no extra query).
  const remyDateCoverage = computeCoverage(
    memoryCount,
    remySignals.intelligence?.historicalTotal ?? 0
  );

  // Family Workspace Intelligence — only for a family (>= 2 accessible profiles).
  const familyProfiles = (
    accessibleProfiles || []
  ).map((p) => ({
    id: p.id,
    name:
      p.preferred_name ||
      p.profile_name ||
      "Family member",
  }));

  const familyIntelligence =
    familyProfiles.length >= 2
      ? await getFamilyIntelligence(
          supabase,
          familyProfiles
        )
      : null;

  // Remy Notifications — pure synthesis of the intelligence already computed
  // above (no extra queries). Single source of truth for the updates layer.
  const remyNotifications =
    getRemyNotifications({
      coverage: remyDateCoverage,
      collections: remyCollections,
      connections: remyConnections,
      chapters: remyLifeChapters,
      family: familyIntelligence,
    });

  // Remy Timeline — pure synthesis of the same intelligence into a chronological
  // narrative (no extra queries).
  const remyTimeline = getRemyTimeline({
    chapters: remyLifeChapters,
    collections: remyCollections,
    connections: remyConnections,
  });

  // Remy header mood — celebrates a new chapter/family discovery, otherwise
  // welcomes. Derived from the notifications already synthesized (no new query).
  const remyHeaderMood = remyNotifications.some(
    (n) =>
      n.category === "chapter" || n.category === "family"
  )
    ? "celebrating"
    : remyMoodForContext("dashboard");

  // Remy Story Mode — pure composition of guided chapter journeys (no queries).
  const remyStories = getRemyStories({
    chapters: remyLifeChapters,
    collections: remyCollections,
    connections: remyConnections,
  });

  // Remy Biography — pure composition of a readable life document (no queries).
  const remyBiography = getRemyBiography({
    stories: remyStories,
    chapters: remyLifeChapters,
    collections: remyCollections,
    connections: remyConnections,
    family: familyIntelligence,
    coverage: remyDateCoverage,
  });

  // Remy Memory Book — pure composition of the biography into a book preview.
  const remyMemoryBook = getRemyMemoryBook({
    biography: remyBiography,
    stories: remyStories,
  });

  // Story signals — narrative readiness from intelligence already composed above
  // (no extra queries, no AI). Family path only: chapterCount uses the FULL,
  // family-scoped decade distribution. Single-workspace story readiness is
  // deferred alongside single-workspace Life Journey — remyLifeChapters is
  // account-wide and capped (limit 4), so it can't give a reliable per-workspace
  // chapter count without a new query.
  const workspaceStorySignals = familyIntelligence
    ? deriveStorySignals({
        chapterCount: familyIntelligence.decades.length,
        storyCount: remyStories.length,
        strongestChapterTitle: remyLifeChapters[0]?.title ?? null,
        hasStory: remyStories.length > 0,
        hasBiography: Boolean(remyBiography),
        hasMemoryBook: Boolean(remyMemoryBook),
      })
    : undefined;

  // Remy Home Summary — workspace/family understanding. Deterministic synthesis
  // of intelligence ALREADY loaded above (family totals/themes, coverage,
  // collections, accessible profiles) — no extra queries, no AI.
  const workspaceUnderstanding = buildWorkspaceUnderstanding({
    workspaceLabel: familyIntelligence
      ? "your family"
      : isMyNestWorkspace
        ? "My Nest"
        : remySubjectName ?? "this workspace",
    peopleCount: accessibleProfiles.length,
    totalMemories: familyIntelligence?.totalMemories ?? memoryCount,
    totalDated: familyIntelligence?.totalDated ?? remyDateCoverage.dated,
    themes:
      familyIntelligence?.themes ??
      remyCollections.map((c) => ({
        label: c.title,
        memoryCount: c.memoryCount,
      })),
    // Full family decade distribution (family path); single-workspace Life
    // Journey is a follow-up (needs a per-workspace decade source).
    decades: familyIntelligence?.decades,
    story: workspaceStorySignals,
  });

  // Voice Engine V1 — present the unified observation stream (understanding-derived
  // via the bridge + signal-derived) as speakable voice lines. Pure transform —
  // no new intelligence, no AI. The end of the pipeline: Observations → Voice → UI.
  const remyVoiceLines = observationsToVoiceLines(
    fuseObservations(
      workspaceUnderstanding,
      remyVoice(remySubjectName, !isMyNestWorkspace),
      remyObservations,
    ),
  );

  const dashboardDurationMs = 0;

  const recentMemories = [
    {
      id: "memories",
      title: "View all memories",
      href: "/memories",
    },
    {
      id: "timeline",
      title: "Open timeline",
      href: "/timeline",
    },
    {
      id: "memory-chat",
      title: "Ask Remy",
      href: "/remy",
    },
  ];

  logDashboardStage(
    "dashboard-request-completed",
    {
      dashboardRequestId,

      activeProfileId,

      accessibleProfiles:
        accessibleProfiles?.length || 0,

      memoryCount,

      durationMs:
        dashboardDurationMs,
    }
  );

  logDashboardLoad({
    requestId:
      dashboardRequestId,

    userId: user.id,

    profileId:
      activeProfileId ||
      undefined,

    metadata: {
      memoryCount,
      durationMs:
        dashboardDurationMs,
    },
  });

  return (
    <WorkspaceShell>

      {/* Mobile (< md): drop the inner horizontal padding (the app shell already
          gutters px-4) to recover ~48px of width, and tighten the vertical rhythm
          to cut scroll length. md+ keeps the original px-6 / py-10 / space-y-8. */}
      <main className="max-w-6xl mx-auto px-0 py-6 space-y-4 md:px-6 md:py-10 md:space-y-8">

        

        {/* DASHBOARD ENTRY */}
        <DashboardHeader
          greeting={greeting}
          displayName={displayName}
          workspaceType={workspaceType}
          remyMood={remyHeaderMood}
        />

        {/* REMY HOME SUMMARY — workspace/family "what Remy understands" (the Remy
            Home foundation). Additive: everything below continues unchanged. */}
        <RemyHomeSummary understanding={workspaceUnderstanding} />

        {/* REMY VOICE — the presentation end of the pipeline (Observations →
            Voice → UI). Additive validation; RemyCompanion stays below. */}
        <RemyVoicePreview lines={remyVoiceLines} />

        {/* REMY COMPANION — AI companion layer above the command center */}
        <RemyCompanion
          observations={remyObservations}
          subjectName={
            !isMyNestWorkspace
              ? remySubjectName
              : null
          }
        />

        {/* MEMORY DATE ADOPTION — nudge when coverage is low */}
        {remyDateCoverage.total > 0 &&
          remyDateCoverage.percentage < 50 && (
            <DateCompletionCard
              coverage={remyDateCoverage}
            />
        )}

        {/* REMINISCENCE — invite to revisit the past when dated memories exist */}
        {remyDateCoverage.dated > 0 && (
          <ReminisceDashboardCard
            datedCount={remyDateCoverage.dated}
          />
        )}

        {/* REMY ACTIVITY — the evidence layer: "what Remy noticed" */}
        <RemyActivityFeed
          activities={remyActivities}
        />

        {/* REMY UPDATES — synthesized intelligence notifications */}
        <RemyNotifications
          notifications={remyNotifications}
        />

        {/* REMY TIMELINE — visual narrative above the drill-down layers */}
        <RemyTimeline events={remyTimeline} />

        {/* EXPLORE YOUR STORY — one compact preview of the Library (Collections,
            Connections, Chapters, Story, Biography, Memory Book). The full
            destinations now live in /library; the dashboard only previews them.
            All underlying data is still generated above — only the six full
            widget renders were removed. */}
        <DashboardStoryPreview
          collectionCount={remyCollections.length}
          connectionCount={remyConnections.length}
          chapterCount={remyLifeChapters.length}
          continueReading={
            remyStories[0]
              ? {
                  label: remyStories[0].title,
                  href: remyStories[0].href ?? "/library/story",
                }
              : null
          }
          narratives={{
            story: remyStories.length > 0,
            biography: Boolean(remyBiography),
            memoryBook: Boolean(remyMemoryBook),
          }}
        />

        {/* FAMILY WORKSPACE INTELLIGENCE — family-level layer (>= 2 profiles) */}
        {familyIntelligence &&
          familyIntelligence.profiles.length >= 2 &&
          familyIntelligence.totalMemories > 0 && (
            <>
              <FamilyOverview
                profiles={
                  familyIntelligence.profiles
                }
                observations={
                  familyIntelligence.observations
                }
              />
              <FamilyThemes
                themes={
                  familyIntelligence.themes
                }
              />
            </>
        )}

        {/* PRIMARY COMMAND CENTER — reminder-driven focus */}
        <DashboardFocus
          reminders={focusReminders}
          careProfileName={
            activeProfile?.preferred_name ||
            activeProfile?.profile_name ||
            null
          }
          isMyNest={isMyNestWorkspace}
        />

        <div className="rounded-3xl border border-sand-deep/70 bg-white p-6 shadow-soft">
          <h2 className="text-lg font-semibold text-charcoal">Quick Resume</h2>
          <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2">
            {recentMemories.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                className="text-sm font-medium text-sage-deep underline-offset-2 hover:underline"
              >
                {item.title}
              </Link>
            ))}
          </div>
        </div>

        {!isMyNestContext && !activeProfile && (
          <DashboardActiveProfileWarning />
        )}

        {/* WORKSPACE SUMMARY — compact row only. Workspace switching AND
            care-profile management (switch, invite caregiver, add a person) now
            live in the global top-bar Workspace Selector, available on every
            authenticated screen — no longer scattered across the dashboard. */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-2xl border border-sand-deep/70 bg-white px-4 py-3 text-sm shadow-soft">
          <span className="font-semibold text-charcoal">
            Workspace:{" "}
            {isMyNestContext
              ? "My Nest"
              : activeProfile?.profile_name ?? "Care"}
          </span>
          <span className="text-charcoal-muted">{memoryCount} memories</span>
          <span className="text-charcoal-muted">
            {accessibleProfiles.length}{" "}
            {accessibleProfiles.length === 1 ? "profile" : "profiles"}
          </span>
        </div>

        <DashboardStats
          memoryCount={memoryCount}
          currentPlan={resolvedSubscription.plan}
          isPremium={resolvedSubscription.isPremium}
        />

        {/* PENDING INVITES */}
        <PendingInvites
          invites={
            pendingInvites || []
          }
        />

        <DashboardTelemetry
          memoryCount={memoryCount}
          activeProfileName={
            activeProfile?.profile_name
          }
        />

        {/* ACCOUNT STATUS */}
        <DashboardAccountStatus
          currentPlan={resolvedSubscription.plan}
          isPremium={resolvedSubscription.isPremium}
        />

        {/* CREATE MEMORY */}
        <DashboardCreateMemory />
      </main>
    </WorkspaceShell>
  );
}