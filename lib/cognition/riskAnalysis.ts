import {
  MoodTelemetry,
  RiskTelemetry,
} from "@/lib/types/telemetry";

interface RiskTelemetryResult {
  riskData: RiskTelemetry[];

  variability: string;

  stability: string;

  cognitiveRisk: string;
}

export function calculateRiskTelemetry(
  moodData: MoodTelemetry[]
): RiskTelemetryResult {

  const riskData =
    moodData.map(
      (
        entry: MoodTelemetry,
        index: number
      ): RiskTelemetry => {

        const previous =
          moodData[index - 1];

        const risk =
          previous
            ? Math.abs(
                entry.positive -
                previous.positive
              ) * 8
            : 0;

        return {
          date: entry.date,
          risk,
        };
      }
    );

  const averageRisk =
    riskData.reduce(
      (
        acc: number,
        curr: RiskTelemetry
      ) => (
        acc +
        curr.risk
      ),
      0
    ) / (
      riskData.length || 1
    );

  return {

    riskData,

    variability:
      averageRisk < 20
        ? "Low"
        : averageRisk < 40
        ? "Moderate"
        : "High",

    stability:
      averageRisk < 20
        ? "Stable"
        : "Variable",

    cognitiveRisk:
      averageRisk < 20
        ? "Minimal"
        : averageRisk < 40
        ? "Observed"
        : "Elevated",
  };
}