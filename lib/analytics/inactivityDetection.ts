import { Memory } from "@/lib/types/memory";

interface InactivityDetectionResult {
  inactiveDays: number;

  inactivityLevel: string;

  // LA5: describes memory-LOGGING frequency (days since the last memory), NOT
  // cognition. Renamed from `cognitiveActivity` + neutralized values so it can
  // never read as a pseudo-clinical cognitive-decline signal (see the CLAUDE.md
  // health rule; completes LA1/LA5 de-medicalization).
  loggingActivity: string;
}

export function detectInactivityPatterns(
  memories: Memory[]
): InactivityDetectionResult {

  if (memories.length === 0) {

    return {
      inactiveDays: 999,
      inactivityLevel: "Critical",
      loggingActivity: "No entries yet",
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

  let loggingActivity =
    "Active";

  if (
    inactiveDays >= 14
  ) {

    inactivityLevel =
      "High";

    loggingActivity =
      "Quiet";
  }

  else if (
    inactiveDays >= 7
  ) {

    inactivityLevel =
      "Moderate";

    loggingActivity =
      "Quieter";
  }

  return {
    inactiveDays,
    inactivityLevel,
    loggingActivity,
  };
}