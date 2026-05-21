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

export default async function InsightsPage() {

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
    console.error(
      "Insights memories query failed:",
      memoriesError
    );
  }

  if (remindersError) {
    console.error(
      "Insights reminders query failed:",
      remindersError
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

  return (
    <InsightsClient
      memories={telemetryPayload.memories}
      reminders={telemetryPayload.reminders}
    />
  );
}