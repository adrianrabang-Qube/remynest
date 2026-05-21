import {
  DriftTelemetry,
  MoodTelemetry,
} from "@/lib/types/telemetry";

interface DriftTelemetryResult {
  driftData: DriftTelemetry[];

  stabilityScore: number;

  driftVariance: string;

  continuity: string;
}

export function calculateDriftTelemetry(
  moodData: MoodTelemetry[]
): DriftTelemetryResult {

  const driftData =
    moodData.map(
      (
        entry: MoodTelemetry,
        index: number
      ): DriftTelemetry => {

        const previous =
          moodData[index - 1];

        const drift =
          previous
            ? Math.abs(
                entry.positive -
                previous.positive
              )
            : 0;

        return {
          date: entry.date,
          score: entry.positive,
          drift,
        };
      }
    );

  const averageDrift =
    driftData.reduce(
      (
        acc: number,
        curr: DriftTelemetry
      ) => (
        acc +
        curr.drift
      ),
      0
    ) / (
      driftData.length || 1
    );

  return {

    driftData,

    stabilityScore:
      Math.max(
        0,
        100 - (
          averageDrift * 18
        )
      ),

    driftVariance:
      averageDrift < 2
        ? "Low"
        : averageDrift < 4
        ? "Moderate"
        : "High",

    continuity:
      averageDrift < 2
        ? "Stable"
        : "Variable",
  };
}