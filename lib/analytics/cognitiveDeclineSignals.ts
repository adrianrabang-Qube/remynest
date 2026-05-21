interface CognitiveDeclineSignalsProps {
  volatilityScore: number;

  inactiveDays: number;

  activityScore: number;
}

interface CognitiveDeclineSignalsResult {
  declineRisk: string;

  monitoringLevel: string;

  interventionSuggested: boolean;
}

export function analyzeCognitiveDeclineSignals({
  volatilityScore,
  inactiveDays,
  activityScore,
}: CognitiveDeclineSignalsProps): CognitiveDeclineSignalsResult {

  let riskPoints = 0;

  // =====================================
  // EMOTIONAL VOLATILITY
  // =====================================

  if (
    volatilityScore >= 4
  ) {
    riskPoints += 2;
  }

  else if (
    volatilityScore >= 2
  ) {
    riskPoints += 1;
  }

  // =====================================
  // INACTIVITY
  // =====================================

  if (
    inactiveDays >= 14
  ) {
    riskPoints += 2;
  }

  else if (
    inactiveDays >= 7
  ) {
    riskPoints += 1;
  }

  // =====================================
  // LOW ACTIVITY
  // =====================================

  if (
    activityScore <= 30
  ) {
    riskPoints += 2;
  }

  else if (
    activityScore <= 60
  ) {
    riskPoints += 1;
  }

  let declineRisk =
    "Minimal";

  let monitoringLevel =
    "Passive";

  let interventionSuggested =
    false;

  if (
    riskPoints >= 5
  ) {

    declineRisk =
      "Elevated";

    monitoringLevel =
      "Active";

    interventionSuggested =
      true;
  }

  else if (
    riskPoints >= 3
  ) {

    declineRisk =
      "Observed";

    monitoringLevel =
      "Moderate";
  }

  return {
    declineRisk,
    monitoringLevel,
    interventionSuggested,
  };
}