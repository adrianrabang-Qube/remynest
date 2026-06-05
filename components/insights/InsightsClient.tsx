"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";

const ChartSkeleton = () => (
  <div className="rounded-[32px] border bg-white p-8 shadow-sm animate-pulse">
    <div className="h-8 w-64 rounded bg-gray-200 mb-6" />
    <div className="h-[320px] rounded-3xl bg-gray-100" />
  </div>
);

const AIInsightSummary =
  dynamic(
    () =>
      import(
        "./AIInsightSummary"
      ),
    {
      ssr: false,
      loading: () => <ChartSkeleton />,
    }
  );

const BehavioralAnalyticsCard =
  dynamic(
    () =>
      import(
        "./BehavioralAnalyticsCard"
      ),
    {
      ssr: false,
      loading: () => <ChartSkeleton />,
    }
  );

const CognitiveScoreChart =
  dynamic(
    () =>
      import(
        "./CognitiveScoreChart"
      ),
    {
      ssr: false,
      loading: () => <ChartSkeleton />,
    }
  );

const CognitiveDriftChart =
  dynamic(
    () =>
      import(
        "./CognitiveDriftChart"
      ),
    {
      ssr: false,
      loading: () => <ChartSkeleton />,
    }
  );

const EmotionalTrendsChart =
  dynamic(
    () =>
      import(
        "./EmotionalTrendsChart"
      ),
    {
      ssr: false,
      loading: () => <ChartSkeleton />,
    }
  );

const MoodDistributionChart =
  dynamic(
    () =>
      import(
        "./MoodDistributionChart"
      ),
    {
      ssr: false,
      loading: () => <ChartSkeleton />,
    }
  );

const ReminderConsistencyChart =
  dynamic(
    () =>
      import(
        "./ReminderConsistencyChart"
      ),
    {
      ssr: false,
      loading: () => <ChartSkeleton />,
    }
  );

const SleepRecoveryChart =
  dynamic(
    () =>
      import(
        "./SleepRecoveryChart"
      ),
    {
      ssr: false,
      loading: () => <ChartSkeleton />,
    }
  );

const WearableTelemetryChart =
  dynamic(
    () =>
      import(
        "./WearableTelemetryChart"
      ),
    {
      ssr: false,
      loading: () => <ChartSkeleton />,
    }
  );

const MemoryContinuityChart =
  dynamic(
    () =>
      import(
        "./MemoryContinuityChart"
      ),
    {
      ssr: false,
      loading: () => <ChartSkeleton />,
    }
  );

const AlzheimerRiskSignals =
  dynamic(
    () =>
      import(
        "./AlzheimerRiskSignals"
      ),
    {
      ssr: false,
      loading: () => <ChartSkeleton />,
    }
  );

const AttentionAnalytics =
  dynamic(
    () =>
      import(
        "./AttentionAnalytics"
      ),
    {
      ssr: false,
      loading: () => <ChartSkeleton />,
    }
  );

import { calculateCognitionScore } from "@/lib/cognition/cognitionScore";
import { calculateDriftTelemetry } from "@/lib/cognition/driftEngine";
import { calculateContinuityTelemetry } from "@/lib/cognition/continuityEngine";
import { calculateRiskTelemetry } from "@/lib/cognition/riskAnalysis";
import { calculateAttentionTelemetry } from "@/lib/cognition/attentionEngine";
import { calculateSleepRecoveryTelemetry } from "@/lib/cognition/sleepRecoveryEngine";
import { calculateWearableTelemetry } from "@/lib/cognition/wearableEngine";

import { generateInsightSummary } from "@/lib/insights/generateInsightSummary";

import AIDisclaimer from "@/components/ai/AIDisclaimer";

import { analyzeBehavioralPatterns } from "@/lib/analytics/behavioralPatterns";
import { analyzeReminderStreaks } from "@/lib/analytics/streakAnalysis";
import { analyzeEmotionalVolatility } from "@/lib/analytics/emotionalVolatility";
import { detectInactivityPatterns } from "@/lib/analytics/inactivityDetection";
import { analyzeCognitiveDeclineSignals } from "@/lib/analytics/cognitiveDeclineSignals";

import { Memory } from "@/lib/types/memory";
import { Reminder } from "@/lib/types/reminder";

import {
  MoodTelemetry,
  ReminderTelemetry,
} from "@/lib/types/telemetry";

const moodScores: Record<
  string,
  number
> = {
  happy: 8,
  excited: 9,
  calm: 7,
  neutral: 5,
  anxious: 3,
  sad: 2,
  stressed: 2,
};

interface InsightsClientProps {
  memories: Memory[];

  reminders: Reminder[];
}

export default function InsightsClient({
  memories = [],
  reminders = [],
}: InsightsClientProps) {

  // =====================================
  // MOOD TELEMETRY
  // =====================================

  const moodData =
    useMemo(() => {

      return memories.map(
        (
          memory: Memory
        ): MoodTelemetry => {

          const mood =
            memory.ai_mood
              ?.toLowerCase()
              ?.trim() || "neutral";

          return {

            date:
              new Date(
                memory.created_at
              ).toLocaleDateString(
                "en-US",
                {
                  weekday: "short",
                }
              ),

            positive:
              moodScores[mood] || 5,
          };
        }
      );

    }, [memories]);

  // =====================================
  // CATEGORY TELEMETRY
  // =====================================

  const categoryData =
    useMemo(() => {

      const categoryMap: Record<
        string,
        number
      > = {};

      memories.forEach(
        (memory: Memory) => {

          const category =
            memory.ai_category?.trim()
            || "Uncategorized";

          if (!categoryMap[category]) {
            categoryMap[category] = 0;
          }

          categoryMap[category] += 1;
        }
      );

      return Object.entries(
        categoryMap
      ).map(
        ([name, value]) => ({
          name,
          value,
        })
      );

    }, [memories]);

  // =====================================
  // REMINDER TELEMETRY
  // =====================================

  const reminderData =
    useMemo(() => {

      const telemetry:
        ReminderTelemetry[] = [

        {
          week: "W1",
          completed: 0,
        },

        {
          week: "W2",
          completed: 0,
        },

        {
          week: "W3",
          completed: 0,
        },

        {
          week: "W4",
          completed: 0,
        },
      ];

      reminders.forEach(
        (reminder: Reminder) => {

          if (!reminder.completed)
            return;

          const date =
            new Date(
              reminder.created_at
            );

          const day =
            date.getDate();

          if (day <= 7) {
            telemetry[0].completed += 1;
          }

          else if (day <= 14) {
            telemetry[1].completed += 1;
          }

          else if (day <= 21) {
            telemetry[2].completed += 1;
          }

          else {
            telemetry[3].completed += 1;
          }
        }
      );

      return telemetry;

    }, [reminders]);

  // =====================================
  // COGNITION ENGINE LAYER
  // =====================================

  const cognitionScore =
    useMemo(() => {

      return calculateCognitionScore({
        memories,
        reminders,
        moodData,
      });

    }, [
      memories,
      reminders,
      moodData,
    ]);

  const {
    driftData,
  } =
    useMemo(() => {

      return calculateDriftTelemetry(
        moodData
      );

    }, [moodData]);

  const {
    continuityData,
  } =
    useMemo(() => {

      return calculateContinuityTelemetry(
        moodData
      );

    }, [moodData]);

  const {
    attentionData,
  } =
    useMemo(() => {

      return calculateAttentionTelemetry(
        moodData
      );

    }, [moodData]);

  const {
    sleepData,
  } =
    useMemo(() => {

      return calculateSleepRecoveryTelemetry(
        moodData
      );

    }, [moodData]);

  const {
    wearableData,
  } =
    useMemo(() => {

      return calculateWearableTelemetry(
        moodData
      );

    }, [moodData]);

  const {
    riskData,
  } =
    useMemo(() => {

      return calculateRiskTelemetry(
        moodData
      );

    }, [moodData]);

  // =====================================
  // ANALYTICS INTELLIGENCE LAYER
  // =====================================

  const behavioralPatterns =
    useMemo(() => {

      return analyzeBehavioralPatterns(
        memories
      );

    }, [memories]);

  const streakAnalysis =
    useMemo(() => {

      return analyzeReminderStreaks(
        reminders
      );

    }, [reminders]);

  const emotionalVolatility =
    useMemo(() => {

      return analyzeEmotionalVolatility(
        moodData
      );

    }, [moodData]);

  const inactivityDetection =
    useMemo(() => {

      return detectInactivityPatterns(
        memories
      );

    }, [memories]);

  const declineSignals =
    useMemo(() => {

      return analyzeCognitiveDeclineSignals({

        volatilityScore:
          emotionalVolatility.volatilityScore,

        inactiveDays:
          inactivityDetection.inactiveDays,

        activityScore:
          behavioralPatterns.activityScore,
      });

    }, [
      emotionalVolatility,
      inactivityDetection,
      behavioralPatterns,
    ]);

  // =====================================
  // AI INSIGHT INTERPRETATION
  // =====================================

  const insights =
    useMemo(() => {

      return generateInsightSummary({
        cognitionScore,
        driftData,
        reminderData,
      });

    }, [
      cognitionScore,
      driftData,
      reminderData,
    ]);

  return (

    <div className="max-w-7xl mx-auto p-6 space-y-8">

      {/* HEADER */}

      <div>

        <div className="inline-flex items-center rounded-full bg-white border px-4 py-2 text-sm text-gray-600 mb-6">
          Cognitive Analytics
        </div>

        <h1 className="text-6xl font-bold tracking-tight text-[#243428]">
          Insights Dashboard
        </h1>

        <p className="text-gray-500 text-xl mt-4">
          Longitudinal cognitive insights,
          emotional trends,
          and continuity analytics.
        </p>

      </div>

      {/* AI SAFETY DISCLAIMER */}

      <AIDisclaimer
        variant="banner"
        kind="insights"
      />

      {/* AI INTERPRETATION */}

      <AIInsightSummary
        insights={insights}
      />

      {/* BEHAVIORAL ANALYTICS */}

      <BehavioralAnalyticsCard
        behavioralPatterns={
          behavioralPatterns
        }

        streakAnalysis={
          streakAnalysis
        }

        emotionalVolatility={
          emotionalVolatility
        }

        inactivityDetection={
          inactivityDetection
        }

        declineSignals={
          declineSignals
        }
      />

      {/* TELEMETRY */}

      <CognitiveScoreChart
        cognitionScore={cognitionScore}
      />

      <CognitiveDriftChart
        driftData={driftData}
      />

      <EmotionalTrendsChart
        moodData={moodData}
      />

      <MoodDistributionChart
        categoryData={categoryData}
      />

      <ReminderConsistencyChart
        reminderData={reminderData}
      />

      <MemoryContinuityChart
        continuityData={continuityData}
      />

      <AttentionAnalytics
        attentionData={attentionData}
      />

      <SleepRecoveryChart
        sleepData={sleepData}
      />

      <WearableTelemetryChart
        wearableData={wearableData}
      />

      <AlzheimerRiskSignals
        riskData={riskData}
      />

    </div>
  );
}