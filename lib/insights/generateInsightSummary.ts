interface DriftDatum {
  drift?: number
}

interface ReminderDatum {
  completed?: number
}

interface InsightSummaryProps {
  cognitionScore: number
  driftData: DriftDatum[]
  reminderData: ReminderDatum[]
}

export function generateInsightSummary({
  cognitionScore,
  driftData,
  reminderData,
}: InsightSummaryProps) {

  const latestDrift =
    driftData[
      driftData.length - 1
    ];

  const latestDriftValue =
    latestDrift?.drift ?? 0;

  const completedReminders =
    reminderData.reduce(
      (
        acc: number,
        curr: ReminderDatum
      ) => (
        acc +
        (curr.completed || 0)
      ),
      0
    );

  let cognitionMessage =
    "";

  if (cognitionScore >= 80) {

    cognitionMessage =
      "Cognitive telemetry remains highly stable with strong continuity signals.";

  }

  else if (
    cognitionScore >= 60
  ) {

    cognitionMessage =
      "Cognitive performance remains stable with moderate variability detected.";

  }

  else {

    cognitionMessage =
      "Cognitive telemetry indicates elevated variability and reduced continuity.";
  }

  let driftMessage =
    "";

  if (
    latestDriftValue <= 2
  ) {

    driftMessage =
      "Minimal emotional drift detected across recent memory activity.";

  }

  else {

    driftMessage =
      "Elevated emotional variability detected in recent telemetry.";
  }

  let reminderMessage =
    "";

  if (
    completedReminders >= 10
  ) {

    reminderMessage =
      "Reminder adherence patterns remain highly consistent.";

  }

  else {

    reminderMessage =
      "Reminder completion consistency has decreased recently.";
  }

  return [
    cognitionMessage,
    driftMessage,
    reminderMessage,
  ];
}