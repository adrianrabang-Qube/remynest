"use client";

import { memo } from "react";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

type ContinuityDatum = {
  date?: string;
  continuity?: number;
};

const MemoryContinuityChart = memo(
  function MemoryContinuityChart({
    continuityData = [],
  }: {
    continuityData?: ContinuityDatum[];
  }) {

    return (

      <div className="rounded-[32px] border bg-white p-8 shadow-sm">

        {/* HEADER */}

        <div className="mb-8">

          <div className="inline-flex items-center rounded-full bg-[#eef2ea] px-4 py-2 text-sm text-[#243428] mb-4">
            Memory Continuity Telemetry
          </div>

          <h2 className="text-4xl font-bold text-[#243428]">
            Memory Continuity
          </h2>

          <p className="text-gray-500 mt-2 text-lg">
            Longitudinal continuity retention across cognitive interactions.
          </p>

        </div>

        {/* METRICS */}

        <div className="grid grid-cols-3 gap-4 mb-8">

          <div className="rounded-2xl border bg-[#f8faf7] p-5">

            <p className="text-sm text-gray-500">
              Continuity Stability
            </p>

            <h3 className="text-3xl font-bold text-[#243428] mt-2">
              91%
            </h3>

          </div>

          <div className="rounded-2xl border bg-[#f8faf7] p-5">

            <p className="text-sm text-gray-500">
              Retention Integrity
            </p>

            <h3 className="text-3xl font-bold text-[#243428] mt-2">
              Strong
            </h3>

          </div>

          <div className="rounded-2xl border bg-[#f8faf7] p-5">

            <p className="text-sm text-gray-500">
              Recall Drift
            </p>

            <h3 className="text-3xl font-bold text-[#243428] mt-2">
              Minimal
            </h3>

          </div>

        </div>

        {/* CHART */}

        <div className="h-[420px]">

          <ResponsiveContainer
            width="100%"
            height="100%"
          >

            <LineChart
              data={continuityData}
            >

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

              <Line
                type="monotone"
                dataKey="continuity"
                stroke="#243428"
                strokeWidth={4}
                dot={{
                  r: 4,
                }}
              />

            </LineChart>

          </ResponsiveContainer>

        </div>

      </div>
    );
  }
);

export default MemoryContinuityChart;