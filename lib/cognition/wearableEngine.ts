import {
  MoodTelemetry,
  WearableTelemetry,
} from "@/lib/types/telemetry";

interface WearableTelemetryResult {
  wearableData: WearableTelemetry[];

  avgHeartRate: number;

  stressLoad: string;

  recoveryReadiness: string;
}

export function calculateWearableTelemetry(
  moodData: MoodTelemetry[]
): WearableTelemetryResult {

  const wearableData =
    moodData.map(
      (
        entry: MoodTelemetry
      ): WearableTelemetry => {

        const heartRate =
          65 + Math.round(
            Math.random() * 10
          );

        const stress =
          Math.max(
            1,
            10 - entry.positive
          );

        return {
          date: entry.date,
          heartRate,
          stress,
        };
      }
    );

  const averageHeartRate =
    wearableData.reduce(
      (
        acc: number,
        curr: WearableTelemetry
      ) => (
        acc +
        curr.heartRate
      ),
      0
    ) / (
      wearableData.length || 1
    );

  const averageStress =
    wearableData.reduce(
      (
        acc: number,
        curr: WearableTelemetry
      ) => (
        acc +
        curr.stress
      ),
      0
    ) / (
      wearableData.length || 1
    );

  return {

    wearableData,

    avgHeartRate:
      Math.round(
        averageHeartRate
      ),

    stressLoad:
      averageStress <= 3
        ? "Low"
        : averageStress <= 6
        ? "Moderate"
        : "High",

    recoveryReadiness:
      averageStress <= 3
        ? "Strong"
        : averageStress <= 6
        ? "Balanced"
        : "Recovering",
  };
}