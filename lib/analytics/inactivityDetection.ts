import { Memory } from "@/lib/types/memory";

interface InactivityDetectionResult {
  inactiveDays: number;

  inactivityLevel: string;

  cognitiveActivity: string;
}

export function detectInactivityPatterns(
  memories: Memory[]
): InactivityDetectionResult {

  if (memories.length === 0) {

    return {
      inactiveDays: 999,
      inactivityLevel: "Critical",
      cognitiveActivity: "Inactive",
    };
  }

  const latestMemory =
    memories.sort(
      (
        a: Memory,
        b: Memory
      ) =>
        new Date(
          b.created_at
        ).getTime() -
        new Date(
          a.created_at
        ).getTime()
    )[0];

  const latestDate =
    new Date(
      latestMemory.created_at
    );

  const now =
    new Date();

  const differenceMs =
    now.getTime() -
    latestDate.getTime();

  const inactiveDays =
    Math.floor(
      differenceMs /
      (
        1000 *
        60 *
        60 *
        24
      )
    );

  let inactivityLevel =
    "Low";

  let cognitiveActivity =
    "Active";

  if (
    inactiveDays >= 14
  ) {

    inactivityLevel =
      "High";

    cognitiveActivity =
      "Declining";
  }

  else if (
    inactiveDays >= 7
  ) {

    inactivityLevel =
      "Moderate";

    cognitiveActivity =
      "Reduced";
  }

  return {
    inactiveDays,
    inactivityLevel,
    cognitiveActivity,
  };
}