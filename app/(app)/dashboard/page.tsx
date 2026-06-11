import PendingInvites from "@/components/PendingInvites";
import ProfileSwitcher from "@/components/ProfileSwitcher";
import EnterCareProfileList from "@/components/EnterCareProfileList";

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
import DashboardProfilePanel from "./components/DashboardProfilePanel";
import DashboardAccountStatus from "./components/DashboardAccountStatus";
import DashboardCreateProfile from "./components/DashboardCreateProfile";
import DashboardCreateMemory from "./components/DashboardCreateMemory";
import DashboardActiveProfileWarning from "./components/DashboardActiveProfileWarning";
import DashboardTelemetry from "./components/DashboardTelemetry";
import DashboardFocus from "./components/DashboardFocus";
import {
  type FocusReminder,
  deriveDashboardFocus,
} from "@/lib/reminders/focus";
import RemyCompanion from "@/components/remy/RemyCompanion";
import { buildRemySignals } from "@/lib/remy/signals";
import { generateRemyObservations } from "@/lib/remy/observations";
import Link from "next/link";

import { WorkspaceShell } from "./components/workspace/WorkspaceShell";
import { WorkspaceContextPanel } from "./components/workspace/WorkspaceContextPanel";

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

  console.error(
    "[DASHBOARD_RUNTIME_MARKER] page.tsx EXECUTING",
    {
      file: "app/(app)/dashboard/page.tsx",
      dashboardRequestId,
    }
  );

  let accessibleProfiles: Profile[] = [];

  try {
    console.error(
      "[DASHBOARD_RUNTIME_MARKER] BEFORE getAccessibleProfiles"
    );

    accessibleProfiles =
      await getAccessibleProfiles();

    console.error(
      "[DASHBOARD_RUNTIME_MARKER] AFTER getAccessibleProfiles",
      {
        count:
          accessibleProfiles?.length || 0,
        profiles:
          accessibleProfiles,
      }
    );
  } catch (error) {
    console.error(
      "[DASHBOARD_RUNTIME_MARKER] getAccessibleProfiles FAILED",
      error
    );

    accessibleProfiles = [];
  }

  console.error(
    "[DASHBOARD_RUNTIME_MARKER] accessibleProfiles-final",
    {
      count:
        accessibleProfiles?.length || 0,
      profiles:
        accessibleProfiles,
    }
  );

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

  console.info(
    "[ACTIVE_PROFILE_RESOLUTION]",
    {
      activeContext,
      resolvedActiveProfileId,
      finalActiveProfileId:
        activeProfileId,
      accessibleProfilesCount:
        accessibleProfiles?.length || 0,
    }
  );

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

    console.info(
      "[BILLING_DEBUG]",
      {
        userId: user.id,
        userEmail: user.email,
        profileById,
        profileByEmail,
        premiumProfile,
        resolvedProfile: profile,
      }
    );
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
  // PROFILE SWITCHER DATA
  // =====================================

  const switcherProfiles = Array.from(
    new Map(
      (accessibleProfiles || []).map((profile) => [
          profile.id,
          {
            id: profile.id,
            profile_name:
              profile.profile_name,
            preferred_name:
              profile.preferred_name,
            shared:
              Boolean(profile.shared),
            access_level:
              profile.access_level ||
              "owner",
          },
        ]
      )
    ).values()
  );

  console.error(
    "[PROFILE_SWITCHER_PAYLOAD]",
    switcherProfiles
  );

  console.error(
    "[PROFILE_SWITCHER_DEDUPED_COUNT]",
    {
      rawCount:
        accessibleProfiles?.length || 0,
      dedupedCount:
        switcherProfiles.length,
    }
  );

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
    }
  );

  const remyObservations =
    generateRemyObservations(
      remySignals,
      "dashboard"
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
      title: "Continue memory chat",
      href: "/memory-chat",
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

  console.info(
    "[dashboard-page] billing-state",
    {
      userId: user.id,
      userEmail: user.email,
      subscription_plan:
        profile?.subscription_plan,
      is_premium:
        profile?.is_premium,
      subscription_status:
        profile?.subscription_status,
      resolvedCurrentPlan: resolvedSubscription.plan,
    }
  );

  return (
    <WorkspaceShell>

      <main className="max-w-6xl mx-auto px-6 py-10 space-y-8">

        

        {/* DASHBOARD ENTRY */}
        <DashboardHeader
          greeting={greeting}
          displayName={displayName}
        />

        {/* REMY COMPANION — AI companion layer above the command center */}
        <RemyCompanion
          observations={remyObservations}
          subjectName={
            !isMyNestWorkspace
              ? remySubjectName
              : null
          }
        />

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

        {/* MY NEST → CARE ENTRY (writes remynest-active-context) */}
        {isMyNestContext && (
          <EnterCareProfileList profiles={switcherProfiles} />
        )}

        {/* PROFILE CONTEXT FIRST */}
        {!isMyNestContext && (
          <ProfileSwitcher
            profiles={switcherProfiles}
            activeProfileId={activeProfileId}
          />
        )}

        {!isMyNestContext &&
          !activeProfile && (
            <DashboardActiveProfileWarning />
        )}

        {/* EXISTING PROFILE PANEL PRESERVED */}
        {!isMyNestContext && activeProfile && (
          <DashboardProfilePanel
            activeProfile={activeProfile}
          />
        )}

        {/* WORKSPACE CONTEXT — MOVED CLOSER TO PROFILE DETAILS */}
        {!isMyNestContext &&
          activeProfile && (
            <WorkspaceContextPanel
              activeProfile={activeProfile}
              workspaceType={workspaceType}
            />
        )}

        {/* =====================================================
            ACCOUNT & WORKSPACE
            Administrative context (workspace state, invites,
            account status) — separated from the focus surface.
        ===================================================== */}
        <div className="pt-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-charcoal-muted">
            Account &amp; Workspace
          </h2>
          <div className="mt-1 h-px w-full bg-sand-deep/60" />
        </div>

        <section className="grid gap-4 md:grid-cols-2">
          <div className="rounded-3xl border border-sand-deep/70 bg-white p-6 shadow-soft">
            <h3 className="text-lg font-semibold text-charcoal">Care Snapshot</h3>
            <div className="mt-3 space-y-2 text-sm text-charcoal-soft">
              <p>Workspace: {workspaceType}</p>
              <p>Accessible profiles: {accessibleProfiles.length}</p>
              <p>Total memories: {memoryCount}</p>
            </div>
          </div>

          <div className="rounded-3xl border border-sand-deep/70 bg-white p-6 shadow-soft">
            <h3 className="text-lg font-semibold text-charcoal">Memory Insights</h3>
            <p className="mt-3 text-sm text-charcoal-soft">
              Memory activity and cognitive insight summaries will appear here,
              giving caregivers and users a quick overview before opening Insights.
            </p>
          </div>
        </section>

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

        {/* CREATE PROFILE */}
        <DashboardCreateProfile />
      </main>
    </WorkspaceShell>
  );
}