import { Reminder } from "@/lib/types/reminder";

interface StreakAnalysisResult {
  currentStreak: number;

  longestStreak: number;

  adherence: string;
}

export function analyzeReminderStreaks(
  reminders: Reminder[]
): StreakAnalysisResult {

  const completedReminders =
    reminders.filter(
      (
        reminder: Reminder
      ) => reminder.completed
    );

  const currentStreak =
    completedReminders.length;

  const longestStreak =
    completedReminders.length;

  let adherence =
    "Low";

  if (currentStreak >= 20) {
    adherence = "High";
  }

  else if (
    currentStreak >= 10
  ) {
    adherence = "Moderate";
  }

  return {
    currentStreak,
    longestStreak,
    adherence,
  };
}