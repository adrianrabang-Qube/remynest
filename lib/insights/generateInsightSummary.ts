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
      "Your recorded memories show steady, consistent activity and mood entries.";

  }

  else if (
    cognitionScore >= 60
  ) {

    cognitionMessage =
      "Your recorded memories show generally steady activity with some week-to-week variation.";

  }

  else {

    cognitionMessage =
      "Your recorded memories show more variation in activity and mood entries recently.";
  }

  let driftMessage =
    "";

  if (
    latestDriftValue <= 2
  ) {

    driftMessage =
      "Mood entries in your recent memories have stayed fairly consistent.";

  }

  else {

    driftMessage =
      "Mood entries in your recent memories have varied more than usual.";
  }

  let reminderMessage =
    "";

  if (
    completedReminders >= 10
  ) {

    reminderMessage =
      "You've been completing your reminders consistently.";

  }

  else {

    reminderMessage =
      "Reminder completions have been less frequent recently.";
  }

  return [
    cognitionMessage,
    driftMessage,
    reminderMessage,
  ];
}