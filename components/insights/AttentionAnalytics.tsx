"use client";

import { memo } from "react";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

type AttentionDatum = {
  date?: string;
  focus?: number;
};

const AttentionAnalytics = memo(
  function AttentionAnalytics({
    attentionData = [],
  }: {
    attentionData?: AttentionDatum[];
  }) {

  return (

    <div className="rounded-[32px] border bg-white p-8 shadow-sm">

      {/* HEADER */}

      <div className="mb-8">

        <div className="inline-flex items-center rounded-full bg-[#eef2ea] px-4 py-2 text-sm text-[#243428] mb-4">
          Attention Telemetry
        </div>

        <h2 className="text-4xl font-bold text-[#243428]">
          Attention Analytics
        </h2>

        <p className="text-gray-500 mt-2 text-lg">
          Cognitive attention consistency and focus retention analytics.
        </p>

      </div>

      {/* METRICS */}

      <div className="grid grid-cols-3 gap-4 mb-8">

        <div className="rounded-2xl border bg-[#f8faf7] p-5">

          <p className="text-sm text-gray-500">
            Focus Stability
          </p>

          <h3 className="text-3xl font-bold text-[#243428] mt-2">
            88%
          </h3>

        </div>

        <div className="rounded-2xl border bg-[#f8faf7] p-5">

          <p className="text-sm text-gray-500">
            Attention Retention
          </p>

          <h3 className="text-3xl font-bold text-[#243428] mt-2">
            High
          </h3>

        </div>

        <div className="rounded-2xl border bg-[#f8faf7] p-5">

          <p className="text-sm text-gray-500">
            Cognitive Fatigue
          </p>

          <h3 className="text-3xl font-bold text-[#243428] mt-2">
            Low
          </h3>

        </div>

      </div>

      {/* CHART */}

      <div className="h-[420px]">

        <ResponsiveContainer
          width="100%"
          height="100%"
        >

          <AreaChart
            data={attentionData}
          >

            <defs>

              <linearGradient
                id="attentionGradient"
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >

                <stop
                  offset="5%"
                  stopColor="#243428"
                  stopOpacity={0.3}
                />

                <stop
                  offset="95%"
                  stopColor="#243428"
                  stopOpacity={0}
                />

              </linearGradient>

            </defs>

            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
            />

            <XAxis
              dataKey="date"
            />

            <YAxis
              domain={[0, 10]}
            />

            <Tooltip />

            <Area
              type="monotone"
              dataKey="focus"
              stroke="#243428"
              strokeWidth={4}
              fillOpacity={1}
              fill="url(#attentionGradient)"
            />

          </AreaChart>

        </ResponsiveContainer>

      </div>

    </div>
  );
}
);

export default AttentionAnalytics;