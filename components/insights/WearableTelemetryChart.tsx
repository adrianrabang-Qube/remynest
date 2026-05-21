"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

export default function WearableTelemetryChart({
  wearableData = [],
}: any) {

  return (

    <div className="rounded-[32px] border bg-white p-8 shadow-sm">

      {/* HEADER */}

      <div className="mb-8">

        <div className="inline-flex items-center rounded-full bg-[#eef2ea] px-4 py-2 text-sm text-[#243428] mb-4">
          Wearable Telemetry
        </div>

        <h2 className="text-4xl font-bold text-[#243428]">
          Wearable Biometrics
        </h2>

        <p className="text-gray-500 mt-2 text-lg">
          Physiological telemetry from wearable cognitive monitoring systems.
        </p>

      </div>

      {/* METRICS */}

      <div className="grid grid-cols-3 gap-4 mb-8">

        <div className="rounded-2xl border bg-[#f8faf7] p-5">

          <p className="text-sm text-gray-500">
            Avg Heart Rate
          </p>

          <h3 className="text-3xl font-bold text-[#243428] mt-2">
            72 BPM
          </h3>

        </div>

        <div className="rounded-2xl border bg-[#f8faf7] p-5">

          <p className="text-sm text-gray-500">
            Stress Load
          </p>

          <h3 className="text-3xl font-bold text-[#243428] mt-2">
            Moderate
          </h3>

        </div>

        <div className="rounded-2xl border bg-[#f8faf7] p-5">

          <p className="text-sm text-gray-500">
            Recovery Readiness
          </p>

          <h3 className="text-3xl font-bold text-[#243428] mt-2">
            Strong
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
            data={wearableData}
          >

            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
            />

            <XAxis
              dataKey="date"
            />

            <YAxis />

            <Tooltip />

            <Line
              type="monotone"
              dataKey="heartRate"
              stroke="#243428"
              strokeWidth={4}
              dot={{
                r: 4,
              }}
            />

            <Line
              type="monotone"
              dataKey="stress"
              stroke="#8d9b8f"
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