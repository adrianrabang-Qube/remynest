import PendingInvites from "@/components/PendingInvites";

import { createClient } from "@/utils/supabase/server";
import { getCurrentUser } from "@/lib/auth/current-user";

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
import StorageUsageCard from "@/components/storage/StorageUsageCard";
import StorageWarningBanner from "@/components/storage/StorageWarningBanner";
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
import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";

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

/**
 * Progressive-disclosure section (Project Polaris). A native <details> — zero-JS, fully
 * keyboard-accessible, Dynamic-Type-safe. Children stay MOUNTED while collapsed (they are
 * only visually hidden), so any telemetry/beacon effects inside still run exactly as before;
 * this reorganizes presentation only. Used to keep the heavy analytics off the first screen
 * without removing a single feature.
 */
function CollapsibleSection({
  title,
  subtitle,
  defaultOpen = false,
  children,
}: {
  title: string;
  subtitle?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  return (
    <details
      {...(defaultOpen ? { open: true } : {})}
      className="group overflow-hidden rounded-3xl border border-sand-deep/70 bg-white shadow-soft [&_summary::-webkit-details-marker]:hidden"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sage md:px-6">
        <span className="min-w-0">
          <span className="block font-serif text-lg font-semibold text-charcoal">
            {title}
          </span>
          {subtitle ? (
            <span className="mt-0.5 block text-sm text-charcoal-muted">
              {subtitle}
            </span>
          ) : null}
        </span>
        <ChevronDown
          aria-hidden
          className="h-5 w-5 shrink-0 text-charcoal-muted transition-transform duration-200 group-open:rotate-180"
        />
      </summary>
      <div className="space-y-4 border-t border-sand-deep/60 px-4 py-5 md:px-5">
        {children}
      </div>
    </details>
  );
}

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


  const user = await getCurrentUser();

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

    // The email fallback exists only to catch a split/legacy profile row that
    // might hold the premium subscription. If the id-keyed row is already
    // premium it always wins the selection below, so the second round-trip is
    // pure waste — skip it. (Behavior-identical: when profileById is premium the
    // original code also resolved `profile` to profileById.)
    const idIsPremium =
      profileById != null &&
      resolveSubscription(profileById).isPremium;

    const {
      data: profileByEmail,
    } = !idIsPremium && user.email
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
      : memoriesQuery
          .is("memory_profile_id", null)
          .eq("user_id", user.id);

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

  // Family Workspace Intelligence is only loaded for a family (>= 2 accessible
  // profiles); derive the profile list here so its loader can join the parallel
  // wave below.
  const familyProfiles = (
    accessibleProfiles || []
  ).map((p) => ({
    id: p.id,
    name:
      p.preferred_name ||
      p.profile_name ||
      "Family member",
  }));

  // PERF: these six Remy loaders are mutually independent — each only needs data
  // already resolved above (supabase, user.id, memoryCount, focusReminders,
  // accessibleProfiles). They were previously awaited one-after-another (~6
  // serial network waves); a single Promise.all collapses them to one wave.
  // Behavior is unchanged: identical inputs, identical outputs, same downstream
  // assignment. (Mirrors the existing pattern in lib/remy/home-model.ts.)
  const [
    remySignals,
    remyActivitySources,
    remyCollections,
    remyConnections,
    remyLifeChapters,
    familyIntelligence,
  ] = await Promise.all([
    buildRemySignals(supabase, {
      memoryProfileId: effectiveActiveProfileId,
      totalMemories: memoryCount,
      reminders: {
        today: remyReminderSummary.todayTotal,
        overdue: remyReminderSummary.overdue,
        upcomingToday: remyReminderSummary.upcomingToday,
        completedToday: remyReminderSummary.completedToday,
        routines: remyReminderSummary.routines,
      },
      subjectName: remySubjectName,
      isCareContext: !isMyNestWorkspace,
      pendingInvites: pendingInvites?.length ?? 0,
      accessibleProfiles: accessibleProfiles.length,
      userId: user.id,
    }),
    // Evidence layer — recent memories + clusters (reminders reused below).
    fetchRemyActivitySources(supabase, {
      memoryProfileId: effectiveActiveProfileId,
      userId: user.id,
    }),
    // Top themes; includeDetails gives date ranges (reused by the Timeline).
    getRemyCollections(supabase, user.id, {
      limit: 4,
      includeDetails: true,
    }),
    // Top stories — anchor title + connected count.
    getRemyConnections(supabase, user.id, { limit: 4 }),
    // Most significant periods — title + range + count.
    getRemyLifeChapters(supabase, user.id, {
      sort: "count",
      limit: 4,
    }),
    // Family intelligence only for a family (>= 2 accessible profiles).
    familyProfiles.length >= 2
      ? getFamilyIntelligence(supabase, familyProfiles)
      : Promise.resolve(null),
  ]);

  const remyObservations =
    generateRemyObservations(
      remySignals,
      "dashboard"
    );

  // Remy Activity (evidence layer) — reuses the already-fetched reminders + the
  // memories/clusters loaded in the parallel wave above.
  const remyActivities =
    buildRemyActivities({
      memories:
        remyActivitySources.memories,
      reminders: focusReminders,
      clusters:
        remyActivitySources.clusters,
    });

  // Memory date coverage — reuses existing counts (no extra query).
  const remyDateCoverage = computeCoverage(
    memoryCount,
    remySignals.intelligence?.historicalTotal ?? 0
  );

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

      {/* Calm, single reading column (Project Polaris). Mobile keeps px-0 (the app shell
          already gutters px-4); a narrower max-width + generous vertical rhythm cut the
          scanning cost. Every widget below is preserved — only regrouped into a natural
          progression (Greeting → Today → Jump back in → People → Insights → Account), with
          the heavy analytics tucked into progressive-disclosure sections so the first screen
          stays quiet. */}
      <div className="mx-auto max-w-2xl space-y-6 px-0 py-6 md:max-w-3xl md:space-y-8 md:px-6 md:py-10">

        {/* GREETING */}
        <DashboardHeader
          greeting={greeting}
          displayName={displayName}
          workspaceType={workspaceType}
          remyMood={remyHeaderMood}
        />

        {/* ATTENTION — safety + actionable alerts stay above the fold when present. */}
        <StorageWarningBanner />

        {!isMyNestContext && !activeProfile && (
          <DashboardActiveProfileWarning />
        )}

        <PendingInvites invites={pendingInvites || []} />

        {/* TODAY — the reminder-driven focus, a calm one-line summary of what Remy
            understands, and gentle date nudges. The single most "now" surface. */}
        <section aria-label="Today" className="space-y-4">
          <DashboardFocus
            reminders={focusReminders}
            careProfileName={
              activeProfile?.preferred_name ||
              activeProfile?.profile_name ||
              null
            }
            isMyNest={isMyNestWorkspace}
          />

          <RemyHomeSummary understanding={workspaceUnderstanding} />

          {/* MEMORY DATE ADOPTION — nudge when coverage is low */}
          {remyDateCoverage.total > 0 &&
            remyDateCoverage.percentage < 50 && (
              <DateCompletionCard coverage={remyDateCoverage} />
          )}

          {/* REMINISCENCE — invite to revisit the past when dated memories exist */}
          {remyDateCoverage.dated > 0 && (
            <ReminisceDashboardCard datedCount={remyDateCoverage.dated} />
          )}
        </section>

        {/* JUMP BACK IN — quick resume links + the create-memory entry. */}
        <section aria-label="Jump back in" className="space-y-4">
          <div className="rounded-3xl border border-sand-deep/70 bg-white p-5 shadow-soft md:p-6">
            <h2 className="font-serif text-lg font-semibold text-charcoal">
              Jump back in
            </h2>
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

          <DashboardCreateMemory />
        </section>

        {/* PEOPLE & WORKSPACE — who this nest is for. Workspace switching AND care-profile
            management live in the global top-bar Workspace Selector; this is a compact
            summary + any family-level intelligence. */}
        <section aria-label="People and workspace" className="space-y-4">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-3xl border border-sand-deep/70 bg-white px-5 py-4 text-sm shadow-soft">
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

          {/* FAMILY WORKSPACE INTELLIGENCE — family-level layer (>= 2 profiles) */}
          {familyIntelligence &&
            familyIntelligence.profiles.length >= 2 &&
            familyIntelligence.totalMemories > 0 && (
              <>
                <FamilyOverview
                  profiles={familyIntelligence.profiles}
                  observations={familyIntelligence.observations}
                />
                <FamilyThemes themes={familyIntelligence.themes} />
              </>
          )}
        </section>

        {/* INSIGHTS — a calm summary tile that drills into the full analytics at /insights;
            the detailed Remy narrative layers collapse into progressive disclosure so the
            first screen stays quiet. Nothing is removed — only tucked away. */}
        <section aria-label="Insights" className="space-y-3">
          <Link
            href="/insights"
            className="flex items-center justify-between gap-4 rounded-3xl border border-sand-deep/70 bg-white p-5 shadow-soft transition hover:bg-sand/40 md:p-6"
          >
            <span className="min-w-0">
              <span className="block font-serif text-lg font-semibold text-charcoal">
                Insights
              </span>
              <span className="mt-0.5 block text-sm text-charcoal-muted">
                {memoryCount} {memoryCount === 1 ? "memory" : "memories"}
                {remyDateCoverage.dated > 0
                  ? ` · ${remyDateCoverage.dated} with dates`
                  : ""}
              </span>
            </span>
            <span className="shrink-0 text-sm font-medium text-sage-deep">
              View insights →
            </span>
          </Link>

          <CollapsibleSection
            title="More from Remy"
            subtitle="Activity, updates, and your story"
          >
            {/* REMY COMPANION — supportive observations */}
            <RemyCompanion
              observations={remyObservations}
              subjectName={!isMyNestWorkspace ? remySubjectName : null}
            />

            {/* REMY VOICE — the presentation end of the pipeline */}
            <RemyVoicePreview lines={remyVoiceLines} />

            {/* REMY ACTIVITY — the evidence layer: "what Remy noticed" */}
            <RemyActivityFeed activities={remyActivities} />

            {/* REMY UPDATES — synthesized intelligence notifications */}
            <RemyNotifications notifications={remyNotifications} />

            {/* REMY TIMELINE — visual narrative */}
            <RemyTimeline events={remyTimeline} />

            {/* EXPLORE YOUR STORY — Library preview (full destinations live in /library) */}
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
          </CollapsibleSection>
        </section>

        {/* ACCOUNT & STORAGE — plan, usage, cognitive detail; collapsed by default so it
            never competes with today's essentials. Children still mount (telemetry fires). */}
        <CollapsibleSection
          title="Account & storage"
          subtitle="Plan, storage usage, and cognitive detail"
        >
          <DashboardStats
            memoryCount={memoryCount}
            currentPlan={resolvedSubscription.plan}
            isPremium={resolvedSubscription.isPremium}
          />

          {/* STORAGE USAGE — compact widget */}
          <StorageUsageCard variant="compact" />

          {/* ACCOUNT STATUS */}
          <DashboardAccountStatus
            currentPlan={resolvedSubscription.plan}
            isPremium={resolvedSubscription.isPremium}
          />

          <DashboardTelemetry
            memoryCount={memoryCount}
            activeProfileName={activeProfile?.profile_name}
          />
        </CollapsibleSection>
      </div>
    </WorkspaceShell>
  );
}