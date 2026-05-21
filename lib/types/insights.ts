export interface InsightSummary {
  cognitionMessage: string;

  driftMessage: string;

  reminderMessage: string;
}

export interface CognitiveMetrics {
  cognitionScore: number;

  stabilityScore?: number;

  continuity?: string;

  driftVariance?: string;
}

export interface RiskMetrics {
  variability: string;

  stability: string;

  cognitiveRisk: string;
}

export interface WearableMetrics {
  avgHeartRate: number;

  stressLoad: string;

  recoveryReadiness: string;
}