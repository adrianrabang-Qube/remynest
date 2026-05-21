import { Memory } from "@/lib/types/memory";
import { Reminder } from "@/lib/types/reminder";
import { MoodTelemetry } from "@/lib/types/telemetry";

interface CalculateCognitionScoreProps {
  memories: Memory[];

  reminders: Reminder[];

  moodData: MoodTelemetry[];
}

export function calculateCognitionScore({
  memories,
  reminders,
  moodData,
}: CalculateCognitionScoreProps) {

  const totalMemories =
    memories.length;

  const completedReminders =
    reminders.filter(
      (
        reminder: Reminder
      ) => reminder.completed
    ).length;

  const positiveMoods =
    moodData.filter(
      (
        mood: MoodTelemetry
      ) => mood.positive >= 7
    ).length;

  const score =
    Math.min(
      100,

      Math.round(
        (
          (totalMemories * 0.35) +
          (completedReminders * 4) +
          (positiveMoods * 3)
        )
      )
    );

  return score;
}