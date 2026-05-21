"use client";

import AIInsightSummary from "./AIInsightSummary";
import BehavioralAnalyticsCard from "./BehavioralAnalyticsCard";

import CognitiveScoreChart from "./CognitiveScoreChart";
import CognitiveDriftChart from "./CognitiveDriftChart";
import EmotionalTrendsChart from "./EmotionalTrendsChart";
import MoodDistributionChart from "./MoodDistributionChart";
import ReminderConsistencyChart from "./ReminderConsistencyChart";
import SleepRecoveryChart from "./SleepRecoveryChart";
import WearableTelemetryChart from "./WearableTelemetryChart";
import MemoryContinuityChart from "./MemoryContinuityChart";
import AlzheimerRiskSignals from "./AlzheimerRiskSignals";
import AttentionAnalytics from "./AttentionAnalytics";

import { calculateCognitionScore } from "@/lib/cognition/cognitionScore";
import { calculateDriftTelemetry } from "@/lib/cognition/driftEngine";
import { calculateContinuityTelemetry } from "@/lib/cognition/continuityEngine";
import { calculateRiskTelemetry } from "@/lib/cognition/riskAnalysis";
import { calculateAttentionTelemetry } from "@/lib/cognition/attentionEngine";
import { calculateSleepRecoveryTelemetry } from "@/lib/cognition/sleepRecoveryEngine";
import { calculateWearableTelemetry } from "@/lib/cognition/wearableEngine";

import { generateInsightSummary } from "@/lib/insights/generateInsightSummary";

import { analyzeBehavioralPatterns } from "@/lib/analytics/behavioralPatterns";
import { analyzeReminderStreaks } from "@/lib/analytics/streakAnalysis";
import { analyzeEmotionalVolatility } from "@/lib/analytics/emotionalVolatility";
import { analyzeMemoryFrequency } from "@/lib/analytics/memoryFrequency";
import { detectInactivityPatterns } from "@/lib/analytics/inactivityDetection";
import { analyzeCognitiveDeclineSignals } from "@/lib/analytics/cognitiveDeclineSignals";

import { Memory } from "@/lib/types/memory";
import { Reminder } from "@/lib/types/reminder";

import {
  MoodTelemetry,
  ReminderTelemetry,
} from "@/lib/types/telemetry";

interface InsightsClientProps {
  memories: Memory[];

  reminders: Reminder[];
}

export default function InsightsClient({
  memories = [],
  reminders = [],
}: InsightsClientProps) {

  // =====================================
  // EMOTIONAL SCORING ENGINE
  // =====================================

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

  // =====================================
  // MOOD TELEMETRY
  // =====================================

  const moodData =
    memories.map(
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

  // =====================================
  // CATEGORY TELEMETRY
  // =====================================

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

  const categoryData =
    Object.entries(categoryMap).map(
      ([name, value]) => ({
        name,
        value,
      })
    );

  // =====================================
  // REMINDER TELEMETRY
  // =====================================

  const reminderData:
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
        reminderData[0].completed += 1;
      }

      else if (day <= 14) {
        reminderData[1].completed += 1;
      }

      else if (day <= 21) {
        reminderData[2].completed += 1;
      }

      else {
        reminderData[3].completed += 1;
      }
    }
  );

  // =====================================
  // COGNITION ENGINE LAYER
  // =====================================

  const cognitionScore =
    calculateCognitionScore({
      memories,
      reminders,
      moodData,
    });

  const {
    driftData,
  } =
    calculateDriftTelemetry(
      moodData
    );

  const {
    continuityData,
  } =
    calculateContinuityTelemetry(
      moodData
    );

  const {
    attentionData,
  } =
    calculateAttentionTelemetry(
      moodData
    );

  const {
    sleepData,
  } =
    calculateSleepRecoveryTelemetry(
      moodData
    );

  const {
    wearableData,
  } =
    calculateWearableTelemetry(
      moodData
    );

  const {
    riskData,
  } =
    calculateRiskTelemetry(
      moodData
    );

  // =====================================
  // ANALYTICS INTELLIGENCE LAYER
  // =====================================

  const behavioralPatterns =
    analyzeBehavioralPatterns(
      memories
    );

  const streakAnalysis =
    analyzeReminderStreaks(
      reminders
    );

  const emotionalVolatility =
    analyzeEmotionalVolatility(
      moodData
    );

  const memoryFrequency =
    analyzeMemoryFrequency(
      memories
    );

  const inactivityDetection =
    detectInactivityPatterns(
      memories
    );

  const declineSignals =
    analyzeCognitiveDeclineSignals({

      volatilityScore:
        emotionalVolatility.volatilityScore,

      inactiveDays:
        inactivityDetection.inactiveDays,

      activityScore:
        behavioralPatterns.activityScore,
    });

  // =====================================
  // AI INSIGHT INTERPRETATION
  // =====================================

  const insights =
    generateInsightSummary({
      cognitionScore,
      driftData,
      reminderData,
    });

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