import {
  ContinuityTelemetry,
  MoodTelemetry,
} from "@/lib/types/telemetry";

interface ContinuityTelemetryResult {
  continuityData: ContinuityTelemetry[];

  stability: number;

  integrity: string;

  recallDrift: string;
}

export function calculateContinuityTelemetry(
  moodData: MoodTelemetry[]
): ContinuityTelemetryResult {

  const continuityData =
    moodData.map(
      (
        entry: MoodTelemetry,
        index: number
      ): ContinuityTelemetry => {

        const continuity =
          Math.max(
            0,
            10 - (index * 0.2)
          );

        return {
          date: entry.date,

          continuity:
            Number(
              continuity.toFixed(1)
            ),
        };
      }
    );

  const average =
    continuityData.reduce(
      (
        acc: number,
        curr: ContinuityTelemetry
      ) => (
        acc +
        curr.continuity
      ),
      0
    ) / (
      continuityData.length || 1
    );

  return {

    continuityData,

    stability:
      Math.round(
        average * 10
      ),

    integrity:
      average >= 7
        ? "Strong"
        : average >= 5
        ? "Moderate"
        : "Weak",

    recallDrift:
      average >= 7
        ? "Minimal"
        : "Elevated",
  };
}