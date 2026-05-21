import { Memory } from "@/lib/types/memory";

interface MemoryFrequencyResult {
  averagePerWeek: number;

  engagementLevel: string;

  activityDensity: string;
}

export function analyzeMemoryFrequency(
  memories: Memory[]
): MemoryFrequencyResult {

  const totalMemories =
    memories.length;

  const averagePerWeek =
    Number(
      (
        totalMemories / 4
      ).toFixed(1)
    );

  let engagementLevel =
    "Low";

  let activityDensity =
    "Sparse";

  if (
    averagePerWeek >= 10
  ) {

    engagementLevel =
      "High";

    activityDensity =
      "Dense";
  }

  else if (
    averagePerWeek >= 5
  ) {

    engagementLevel =
      "Moderate";

    activityDensity =
      "Active";
  }

  return {
    averagePerWeek,
    engagementLevel,
    activityDensity,
  };
}