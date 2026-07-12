"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";
import { ChevronDown } from "lucide-react";

const ChartSkeleton = () => (
  <div className="animate-pulse rounded-3xl border border-sand-deep/70 bg-white p-8 shadow-soft motion-reduce:animate-none">
    <div className="mb-6 h-8 w-64 max-w-full rounded bg-sand-deep/30" />
    <div className="h-[320px] rounded-2xl bg-sand-deep/20" />
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

// LA1 — de-medicalization: the fabricated-sensor and diagnostic-named charts
// (Cognitive Score/Drift, Memory Continuity/Recall Drift, Attention, Sleep Recovery,
// Wearable Biometrics, Alzheimer Risk Signals) were REMOVED. They synthesized
// pseudo-clinical trend lines from journal mood — data no sensor or clinician
// produced — which contradicts the app's non-diagnostic promise (RC3-flagged
// disclose-or-remove decision, resolved on the honest side). Only real-data views
// remain (emotional tone, memory categories, reminder consistency, everyday patterns).
// The `cognitionScore`/`driftData` values are retained ONLY as inputs to the
// non-clinical text summary (they are no longer shown as a score/chart).
import { calculateCognitionScore } from "@/lib/cognition/cognitionScore";
import { calculateDriftTelemetry } from "@/lib/cognition/driftEngine";

import { generateInsightSummary } from "@/lib/insights/generateInsightSummary";
import { buildRemyInsights } from "@/lib/remy/insights";
import RemyInsightsCenter from "@/components/insights/RemyInsightsCenter";

import AIDisclaimer from "@/components/ai/AIDisclaimer";

import { analyzeBehavioralPatterns } from "@/lib/analytics/behavioralPatterns";
import { analyzeReminderStreaks } from "@/lib/analytics/streakAnalysis";
import { analyzeEmotionalVolatility } from "@/lib/analytics/emotionalVolatility";
import { detectInactivityPatterns } from "@/lib/analytics/inactivityDetection";

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

  // LA5: the fabricated "cognitive-decline risk" scoring (declineRisk /
  // monitoringLevel / interventionSuggested, synthesized from journaling
  // patterns) was removed — it is pseudo-clinical prediction the app must never
  // present (completes LA1's de-medicalization; see the CLAUDE.md health rule).

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

  // =====================================
  // REMY INSIGHTS CENTER (companion layer)
  //   Reuses existing telemetry + Remy signals/observations. Read-only.
  // =====================================

  const remyInsights =
    useMemo(() => {

      return buildRemyInsights({
        memories,
        reminders,
        subjectName: null,
        isCareContext: false,
      });

    }, [memories, reminders]);

  return (

    <div className="space-y-6">

      {/* HEADER */}
      <header>
        <span className="inline-flex items-center rounded-full border border-sand-deep/70 bg-white px-4 py-1.5 text-sm font-medium text-sage-deep">
          Remy Insights Center
        </span>
        <h1 className="mt-4 font-serif text-3xl font-semibold tracking-tight text-charcoal md:text-4xl">
          How things are going
        </h1>
        <p className="mt-2 text-base text-charcoal-muted md:text-lg">
          A calm, companion view of memories, routines, and the days ahead — with the
          full analytics a tap away.
        </p>
      </header>

      {/* AI SAFETY DISCLAIMER */}
      <AIDisclaimer variant="banner" kind="insights" />

      {/* REMY INSIGHTS CENTER — companion experience (the calm summary layer) */}
      <RemyInsightsCenter model={remyInsights} />

      {/* AI INTERPRETATION — plain-language summary, kept immediately visible */}
      <AIInsightSummary insights={insights} />

      {/* DETAILED ANALYTICS — the full telemetry, preserved behind progressive disclosure so
          the page opens calm (Apple Health, not an analytics dashboard). Nothing removed;
          every chart still mounts when the section is expanded. */}
      <details className="group [&_summary::-webkit-details-marker]:hidden">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-3xl border border-sand-deep/70 bg-white px-5 py-4 shadow-soft transition hover:bg-sand/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sage md:px-6">
          <span className="min-w-0">
            <span className="block font-serif text-lg font-semibold text-charcoal">
              Detailed analytics
            </span>
            <span className="mt-0.5 block text-sm text-charcoal-muted">
              Charts and telemetry — open for the full picture.
            </span>
          </span>
          <ChevronDown
            aria-hidden
            className="h-5 w-5 shrink-0 text-charcoal-muted transition-transform duration-200 group-open:rotate-180 motion-reduce:transition-none"
          />
        </summary>

        <div className="mt-4 space-y-6">
          {/* BEHAVIORAL ANALYTICS */}
          <BehavioralAnalyticsCard
            behavioralPatterns={behavioralPatterns}
            streakAnalysis={streakAnalysis}
            emotionalVolatility={emotionalVolatility}
            inactivityDetection={inactivityDetection}
          />

          {/* REAL-DATA VIEWS ONLY (see the de-medicalization note above) —
              emotional tone of the memories, memory categories, and reminder
              consistency. No fabricated biometric/sensor or diagnostic charts. */}
          <EmotionalTrendsChart moodData={moodData} />
          <MoodDistributionChart categoryData={categoryData} />
          <ReminderConsistencyChart reminderData={reminderData} />
        </div>
      </details>

    </div>
  );
}