import {
  MoodTelemetry,
  SleepTelemetry,
} from "@/lib/types/telemetry";

interface SleepRecoveryTelemetryResult {
  sleepData: SleepTelemetry[];

  efficiency: number;

  stability: string;

  cognitiveRecovery: string;
}

export function calculateSleepRecoveryTelemetry(
  moodData: MoodTelemetry[]
): SleepRecoveryTelemetryResult {

  const sleepData =
    moodData.map(
      (
        entry: MoodTelemetry
      ): SleepTelemetry => {

        const recovery =
          Math.min(
            10,
            entry.positive + 2
          );

        return {
          date: entry.date,
          recovery,
        };
      }
    );

  const averageRecovery =
    sleepData.reduce(
      (
        acc: number,
        curr: SleepTelemetry
      ) => (
        acc +
        curr.recovery
      ),
      0
    ) / (
      sleepData.length || 1
    );

  return {

    sleepData,

    efficiency:
      Math.round(
        averageRecovery * 10
      ),

    stability:
      averageRecovery >= 7
        ? "Consistent"
        : averageRecovery >= 5
        ? "Variable"
        : "Poor",

    cognitiveRecovery:
      averageRecovery >= 7
        ? "Healthy"
        : averageRecovery >= 5
        ? "Recovering"
        : "Fatigued",
  };
}