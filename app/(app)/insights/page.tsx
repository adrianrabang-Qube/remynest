import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import {
  createTelemetryGovernanceSnapshot,
  createTelemetryHealthSnapshot,
  createTelemetryLimitWarnings,
  createTelemetryPayload,
  createTelemetryPayloadMetadata,
  createTelemetrySnapshot,
  fetchInsightsTelemetry,
  hasTelemetryWarnings,
  logTelemetrySnapshot,
  logTelemetryWarnings,
  normalizeTelemetry,
  stabilizeTelemetryPayload,
} from "@/lib/data/insights";

import InsightsClient from "@/components/insights/InsightsClient";

export const dynamic =
  "force-dynamic";

export const revalidate = 60;

export const runtime =
  "nodejs";

const INSIGHTS_PAGE_TAG =
  "insights-page";

function logInsightsPageStage(
  stage: string,
  metadata?: unknown
) {
  console.info(
    `[${INSIGHTS_PAGE_TAG}] ${stage}`,
    metadata || {}
  );
}

function logInsightsPageError(
  stage: string,
  error: unknown
) {
  console.error(
    `[${INSIGHTS_PAGE_TAG}] ${stage}`,
    error
  );
}

export default async function InsightsPage() {
  const requestId =
    crypto.randomUUID();

  const pageStart =
    performance.now();

  logInsightsPageStage(
    "insights-page-request-started",
    {
      requestId,
    }
  );

  const supabase =
    await createClient();

  // =====================================
  // AUTHENTICATED USER
  // =====================================

  const {
    data: { user },
  } =
    await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  logInsightsPageStage(
    "insights-page-authenticated",
    {
      requestId,

      userId: user.id,
    }
  );

  // =====================================
  // MEMORIES
  // =====================================

  const {
    memoriesResponse,
    remindersResponse,
  } = await fetchInsightsTelemetry(
    supabase,
    user.id
  );

  const {
    data: memories,
    error: memoriesError,
  } = memoriesResponse;

  const {
    data: reminders,
    error: remindersError,
  } = remindersResponse;

  const telemetrySnapshot =
    createTelemetrySnapshot(
      memories,
      reminders
    );

  const telemetryLimitWarnings =
    createTelemetryLimitWarnings(
      memories,
      reminders
    );

  const telemetryHealth =
    createTelemetryHealthSnapshot(
      memories,
      reminders
    );

  const telemetryGovernanceSnapshot =
    createTelemetryGovernanceSnapshot(
      telemetrySnapshot,
      telemetryHealth
    );

  stabilizeTelemetryPayload(
    telemetryGovernanceSnapshot
  );

  // =====================================
  // QUERY ERROR LOGGING
  // =====================================

  if (memoriesError) {
    logInsightsPageError(
      "insights-memories-query-failed",
      {
        requestId,

        memoriesError,
      }
    );
  }

  if (remindersError) {
    logInsightsPageError(
      "insights-reminders-query-failed",
      {
        requestId,

        remindersError,
      }
    );
  }

  logTelemetrySnapshot(
    telemetryGovernanceSnapshot
  );

  if (
    hasTelemetryWarnings(
      telemetryLimitWarnings
    )
  ) {
    logTelemetryWarnings(
      telemetryLimitWarnings
    );
  }

  const normalizedMemories =
    normalizeTelemetry(memories);

  const normalizedReminders =
    normalizeTelemetry(reminders);

  // =====================================
  // SAFETY FALLBACKS
  // =====================================

  const safeMemories =
    normalizedMemories;

  const safeReminders =
    normalizedReminders;

  const telemetryPayload =
    createTelemetryPayload(
      safeMemories,
      safeReminders
    );

  const telemetryPayloadMetadata =
    createTelemetryPayloadMetadata();

  stabilizeTelemetryPayload(
    telemetryPayload
  );

  stabilizeTelemetryPayload(
    telemetryPayloadMetadata
  );

  // =====================================
  // RETURN
  // =====================================

  const pageDurationMs =
    Number(
      (
        performance.now() -
        pageStart
      ).toFixed(2)
    );

  logInsightsPageStage(
    "insights-page-request-completed",
    {
      requestId,

      memoryCount:
        telemetryPayload.memories.length,

      reminderCount:
        telemetryPayload.reminders.length,

      pageDurationMs,
    }
  );

  return (
    <main className="min-h-screen bg-[#f5f1e8]">
      <section className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <InsightsClient
          memories={telemetryPayload.memories}
          reminders={telemetryPayload.reminders}
        />
      </section>
    </main>
  );
}