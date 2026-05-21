import { MoodTelemetry } from "@/lib/types/telemetry";

interface EmotionalVolatilityResult {
  volatilityScore: number;

  emotionalStability: string;

  fluctuationLevel: string;
}

export function analyzeEmotionalVolatility(
  moodData: MoodTelemetry[]
): EmotionalVolatilityResult {

  if (moodData.length <= 1) {

    return {
      volatilityScore: 0,
      emotionalStability: "Stable",
      fluctuationLevel: "Minimal",
    };
  }

  let totalDifference = 0;

  for (
    let i = 1;
    i < moodData.length;
    i++
  ) {

    totalDifference +=
      Math.abs(
        moodData[i].positive -
        moodData[i - 1].positive
      );
  }

  const volatilityScore =
    Number(
      (
        totalDifference /
        moodData.length
      ).toFixed(1)
    );

  let emotionalStability =
    "Stable";

  let fluctuationLevel =
    "Minimal";

  if (
    volatilityScore >= 4
  ) {

    emotionalStability =
      "Variable";

    fluctuationLevel =
      "High";
  }

  else if (
    volatilityScore >= 2
  ) {

    emotionalStability =
      "Moderate";

    fluctuationLevel =
      "Moderate";
  }

  return {
    volatilityScore,
    emotionalStability,
    fluctuationLevel,
  };
}