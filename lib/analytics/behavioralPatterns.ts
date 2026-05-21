import { Memory } from "@/lib/types/memory";

interface BehavioralPatternResult {
  consistency: string;

  activityScore: number;

  patternStrength: string;
}

export function analyzeBehavioralPatterns(
  memories: Memory[]
): BehavioralPatternResult {

  const totalMemories =
    memories.length;

  const activityScore =
    Math.min(
      100,
      totalMemories * 4
    );

  let consistency =
    "Low";

  if (activityScore >= 70) {
    consistency = "High";
  }

  else if (
    activityScore >= 40
  ) {
    consistency = "Moderate";
  }

  let patternStrength =
    "Emerging";

  if (activityScore >= 70) {
    patternStrength =
      "Strong";
  }

  else if (
    activityScore >= 40
  ) {
    patternStrength =
      "Developing";
  }

  return {
    consistency,
    activityScore,
    patternStrength,
  };
}