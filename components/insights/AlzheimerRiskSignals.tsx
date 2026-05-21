"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

export default function AlzheimerRiskSignals({
  riskData = [],
}: any) {

  return (

    <div className="rounded-[32px] border bg-white p-8 shadow-sm">

      {/* HEADER */}

      <div className="mb-8">

        <div className="inline-flex items-center rounded-full bg-[#fff4f2] px-4 py-2 text-sm text-[#9f3a2f] mb-4">
          Neurodegenerative Risk Telemetry
        </div>

        <h2 className="text-4xl font-bold text-[#243428]">
          Alzheimer Risk Signals
        </h2>

        <p className="text-gray-500 mt-2 text-lg">
          Longitudinal behavioral drift and cognitive anomaly detection analytics.
        </p>

      </div>

      {/* RISK METRICS */}

      <div className="grid grid-cols-3 gap-4 mb-8">

        <div className="rounded-2xl border bg-[#fff9f8] p-5">

          <p className="text-sm text-gray-500">
            Drift Variability
          </p>

          <h3 className="text-3xl font-bold text-[#9f3a2f] mt-2">
            Low
          </h3>

        </div>

        <div className="rounded-2xl border bg-[#fff9f8] p-5">

          <p className="text-sm text-gray-500">
            Pattern Stability
          </p>

          <h3 className="text-3xl font-bold text-[#243428] mt-2">
            Stable
          </h3>

        </div>

        <div className="rounded-2xl border bg-[#fff9f8] p-5">

          <p className="text-sm text-gray-500">
            Cognitive Risk
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

          <AreaChart
            data={riskData}
          >

            <defs>

              <linearGradient
                id="riskGradient"
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >

                <stop
                  offset="5%"
                  stopColor="#9f3a2f"
                  stopOpacity={0.35}
                />

                <stop
                  offset="95%"
                  stopColor="#9f3a2f"
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
              domain={[0, 100]}
            />

            <Tooltip />

            <Area
              type="monotone"
              dataKey="risk"
              stroke="#9f3a2f"
              strokeWidth={4}
              fillOpacity={1}
              fill="url(#riskGradient)"
            />

          </AreaChart>

        </ResponsiveContainer>

      </div>

    </div>
  );
}