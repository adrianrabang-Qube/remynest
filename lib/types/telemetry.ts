export interface MoodTelemetry {
  date: string;

  positive: number;
}

export interface DriftTelemetry {
  date: string;

  score: number;

  drift: number;
}

export interface ContinuityTelemetry {
  date: string;

  continuity: number;
}

export interface AttentionTelemetry {
  date: string;

  focus: number;
}

export interface SleepTelemetry {
  date: string;

  recovery: number;
}

export interface WearableTelemetry {
  date: string;

  heartRate: number;

  stress: number;
}

export interface RiskTelemetry {
  date: string;

  risk: number;
}

export interface ReminderTelemetry {
  week: string;

  completed: number;
}

export type TelemetryHealthStatus =
  | "healthy"
  | "warning";

export interface TelemetrySnapshot {
  memories: number;

  reminders: number;
}

export interface TelemetryHealthSnapshot {
  memories: TelemetryHealthStatus;

  reminders: TelemetryHealthStatus;
}

export interface TelemetryLimitWarnings {
  memories: boolean;

  reminders: boolean;
}

export interface TelemetryGovernance {
  cacheWindow: string;

  queryLimit: number;

  warningThreshold: number;
}

export interface TelemetryGovernanceSnapshot {
  governance: TelemetryGovernance;

  snapshot: TelemetrySnapshot;

  health: TelemetryHealthSnapshot;
}

export interface TelemetryPayloadMetadata {
  generatedAt: string;

  cacheWindow: string;
}

export interface InsightsTelemetryPayload<
  TMemories,
  TReminders
> {
  memories: TMemories[];

  reminders: TReminders[];
}

export interface TelemetryQueryResponses<
  TMemories,
  TReminders
> {
  memoriesResponse: TMemories;

  remindersResponse: TReminders;
}

export interface TelemetryObservabilitySnapshot {
  snapshot: TelemetrySnapshot;

  health: TelemetryHealthSnapshot;
}

export interface TelemetryInfrastructureSnapshot {
  governance: TelemetryGovernance;

  snapshot: TelemetrySnapshot;

  health: TelemetryHealthSnapshot;
}

export interface TelemetryDatasetThresholds {
  warningThreshold: number;

  queryLimit: number;
}

export interface TelemetryCacheConfiguration {
  cacheWindow: string;

  cacheTag: string;
}

export interface TelemetryLifecycleMetadata {
  generatedAt: string;

  cacheWindow: string;

  cacheKey?: string;
}

export interface TelemetryFreshnessState {
  isStale: boolean;

  ageMs: number;
}

export interface TelemetryLifecycleSnapshot {
  metadata: TelemetryLifecycleMetadata;

  freshness: TelemetryFreshnessState;
}