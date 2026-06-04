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

type SleepRecoveryDatum = {
  date: string;
  recovery: number;
};

type SleepRecoveryChartProps = {
  sleepData?: SleepRecoveryDatum[];
};

const SleepRecoveryChart = memo(
  function SleepRecoveryChart({
    sleepData = [],
  }: SleepRecoveryChartProps) {

    return (

      <div className="rounded-[32px] border bg-white p-8 shadow-sm">

        {/* HEADER */}

        <div className="mb-8">

          <div className="inline-flex items-center rounded-full bg-[#eef2ea] px-4 py-2 text-sm text-[#243428] mb-4">
            Sleep Recovery Telemetry
          </div>

          <h2 className="text-4xl font-bold text-[#243428]">
            Sleep Recovery
          </h2>

          <p className="text-gray-500 mt-2 text-lg">
            Neurological recovery and restorative cognitive recovery analysis.
          </p>

        </div>

        {/* METRICS */}

        <div className="grid grid-cols-3 gap-4 mb-8">

          <div className="rounded-2xl border bg-[#f8faf7] p-5">

            <p className="text-sm text-gray-500">
              Recovery Efficiency
            </p>

            <h3 className="text-3xl font-bold text-[#243428] mt-2">
              84%
            </h3>

          </div>

          <div className="rounded-2xl border bg-[#f8faf7] p-5">

            <p className="text-sm text-gray-500">
              Sleep Stability
            </p>

            <h3 className="text-3xl font-bold text-[#243428] mt-2">
              Consistent
            </h3>

          </div>

          <div className="rounded-2xl border bg-[#f8faf7] p-5">

            <p className="text-sm text-gray-500">
              Cognitive Recovery
            </p>

            <h3 className="text-3xl font-bold text-[#243428] mt-2">
              Healthy
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
              data={sleepData}
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
                dataKey="recovery"
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

export default SleepRecoveryChart;