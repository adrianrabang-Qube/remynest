"use client";

import { memo } from "react";

import AIDisclaimer from "@/components/ai/AIDisclaimer";

const AIInsightSummary = memo(
  function AIInsightSummary({
    insights = [],
  }: {
    insights?: string[];
  }) {

  return (

    <div className="rounded-[32px] border bg-white p-8 shadow-sm">

      {/* HEADER */}

      <div className="mb-8">

        <div className="inline-flex items-center rounded-full bg-[#eef2ea] px-4 py-2 text-sm text-[#243428] mb-4">
          AI Cognitive Interpretation
        </div>

        <h2 className="text-4xl font-bold text-[#243428]">
          AI Insight Summary
        </h2>

        <p className="text-gray-500 mt-2 text-lg">
          Behavioral interpretation and longitudinal cognition observations generated from telemetry signals.
        </p>

      </div>

      {/* INSIGHTS */}

      <div className="space-y-4">

        {insights.map(
          (
            insight: string,
            index: number
          ) => (

            <div
              key={index}
              className="rounded-2xl border bg-[#f8faf7] p-5"
            >

              <div className="flex items-start gap-4">

                <div className="mt-1 h-3 w-3 rounded-full bg-[#243428]" />

                <p className="text-lg leading-relaxed text-[#243428]">
                  {insight}
                </p>

              </div>

            </div>
          )
        )}

      </div>

      <AIDisclaimer
        variant="footnote"
        kind="general"
      />

    </div>
  );
  }
);

export default AIInsightSummary;