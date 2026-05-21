import {
  AttentionTelemetry,
  MoodTelemetry,
} from "@/lib/types/telemetry";

interface AttentionTelemetryResult {
  attentionData: AttentionTelemetry[];

  focusStability: number;

  retention: string;

  fatigue: string;
}

export function calculateAttentionTelemetry(
  moodData: MoodTelemetry[]
): AttentionTelemetryResult {

  const attentionData =
    moodData.map(
      (
        entry: MoodTelemetry
      ): AttentionTelemetry => {

        const focus =
          Math.min(
            10,
            entry.positive + 1
          );

        return {
          date: entry.date,
          focus,
        };
      }
    );

  const averageFocus =
    attentionData.reduce(
      (
        acc: number,
        curr: AttentionTelemetry
      ) => (
        acc +
        curr.focus
      ),
      0
    ) / (
      attentionData.length || 1
    );

  return {

    attentionData,

    focusStability:
      Math.round(
        averageFocus * 10
      ),

    retention:
      averageFocus >= 7
        ? "High"
        : averageFocus >= 5
        ? "Moderate"
        : "Low",

    fatigue:
      averageFocus >= 7
        ? "Low"
        : averageFocus >= 5
        ? "Moderate"
        : "High",
  };
}