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