"use client";

import { memo } from "react";

interface BehavioralAnalyticsCardProps {
  behavioralPatterns: {
    consistency: string;
    activityScore: number;
    patternStrength: string;
  };

  streakAnalysis: {
    currentStreak: number;
    longestStreak: number;
    adherence: string;
  };

  emotionalVolatility: {
    volatilityScore: number;
    emotionalStability: string;
    fluctuationLevel: string;
  };

  inactivityDetection: {
    inactiveDays: number;
    inactivityLevel: string;
    cognitiveActivity: string;
  };

  declineSignals: {
    declineRisk: string;
    monitoringLevel: string;
    interventionSuggested: boolean;
  };
}

const BehavioralAnalyticsCard = memo(
  function BehavioralAnalyticsCard({
  behavioralPatterns,
  streakAnalysis,
  emotionalVolatility,
  inactivityDetection,
  declineSignals,
}: BehavioralAnalyticsCardProps) {

  return (

    <div className="rounded-[32px] border bg-white p-8 shadow-sm">

      {/* HEADER */}

      <div className="mb-8">

        <div className="inline-flex items-center rounded-full bg-[#eef2ea] px-4 py-2 text-sm text-[#243428] mb-4">
          Behavioral Cognition Intelligence
        </div>

        <h2 className="text-4xl font-bold text-[#243428]">
          Behavioral Analytics
        </h2>

        <p className="text-gray-500 mt-2 text-lg">
          Longitudinal cognition behavior analysis generated from memory activity, emotional telemetry, adherence patterns, and inactivity detection systems.
        </p>

      </div>

      {/* GRID */}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">

        {/* PATTERNS */}

        <div className="rounded-3xl border bg-[#f8faf7] p-6">

          <p className="text-sm text-gray-500">
            Behavioral Consistency
          </p>

          <h3 className="text-4xl font-bold text-[#243428] mt-3">
            {behavioralPatterns.consistency}
          </h3>

          <div className="mt-6 space-y-3 text-sm text-gray-600">

            <div className="flex justify-between">
              <span>
                Activity Score
              </span>

              <span className="font-medium">
                {behavioralPatterns.activityScore}
              </span>
            </div>

            <div className="flex justify-between">
              <span>
                Pattern Strength
              </span>

              <span className="font-medium">
                {behavioralPatterns.patternStrength}
              </span>
            </div>

          </div>

        </div>

        {/* STREAKS */}

        <div className="rounded-3xl border bg-[#f8faf7] p-6">

          <p className="text-sm text-gray-500">
            Reminder Adherence
          </p>

          <h3 className="text-4xl font-bold text-[#243428] mt-3">
            {streakAnalysis.adherence}
          </h3>

          <div className="mt-6 space-y-3 text-sm text-gray-600">

            <div className="flex justify-between">
              <span>
                Current Streak
              </span>

              <span className="font-medium">
                {streakAnalysis.currentStreak}
              </span>
            </div>

            <div className="flex justify-between">
              <span>
                Longest Streak
              </span>

              <span className="font-medium">
                {streakAnalysis.longestStreak}
              </span>
            </div>

          </div>

        </div>

        {/* EMOTIONAL */}

        <div className="rounded-3xl border bg-[#f8faf7] p-6">

          <p className="text-sm text-gray-500">
            Emotional Stability
          </p>

          <h3 className="text-4xl font-bold text-[#243428] mt-3">
            {emotionalVolatility.emotionalStability}
          </h3>

          <div className="mt-6 space-y-3 text-sm text-gray-600">

            <div className="flex justify-between">
              <span>
                Volatility Score
              </span>

              <span className="font-medium">
                {emotionalVolatility.volatilityScore}
              </span>
            </div>

            <div className="flex justify-between">
              <span>
                Fluctuation Level
              </span>

              <span className="font-medium">
                {emotionalVolatility.fluctuationLevel}
              </span>
            </div>

          </div>

        </div>

        {/* INACTIVITY */}

        <div className="rounded-3xl border bg-[#f8faf7] p-6">

          <p className="text-sm text-gray-500">
            Cognitive Activity
          </p>

          <h3 className="text-4xl font-bold text-[#243428] mt-3">
            {inactivityDetection.cognitiveActivity}
          </h3>

          <div className="mt-6 space-y-3 text-sm text-gray-600">

            <div className="flex justify-between">
              <span>
                Inactive Days
              </span>

              <span className="font-medium">
                {inactivityDetection.inactiveDays}
              </span>
            </div>

            <div className="flex justify-between">
              <span>
                Inactivity Level
              </span>

              <span className="font-medium">
                {inactivityDetection.inactivityLevel}
              </span>
            </div>

          </div>

        </div>

        {/* DECLINE */}

        <div className="rounded-3xl border bg-[#fff8f6] p-6">

          <p className="text-sm text-gray-500">
            Decline Risk
          </p>

          <h3 className="text-4xl font-bold text-[#9f3a2f] mt-3">
            {declineSignals.declineRisk}
          </h3>

          <div className="mt-6 space-y-3 text-sm text-gray-600">

            <div className="flex justify-between">
              <span>
                Monitoring Level
              </span>

              <span className="font-medium">
                {declineSignals.monitoringLevel}
              </span>
            </div>

            <div className="flex justify-between">
              <span>
                Intervention
              </span>

              <span className="font-medium">
                {declineSignals.interventionSuggested
                  ? "Suggested"
                  : "Not Required"}
              </span>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
}
);

export default BehavioralAnalyticsCard;