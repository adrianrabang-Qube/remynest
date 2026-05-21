"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function EmotionalTrendsChart({
  moodData = [],
}: any) {

  return (

    <div className="rounded-[32px] border bg-white p-8 shadow-sm">

      {/* HEADER */}

      <div className="mb-8">

        <h2 className="text-4xl font-bold text-[#243428]">
          Emotional Trends
        </h2>

        <p className="text-gray-500 mt-2">
          Emotional continuity patterns over time.
        </p>

      </div>

      {/* CHART */}

      <div className="h-[400px]">

        <ResponsiveContainer
          width="100%"
          height="100%"
        >

          <LineChart data={moodData}>

            <XAxis dataKey="date" />

            <YAxis />

            <Tooltip />

            <Line
              type="monotone"
              dataKey="positive"
              stroke="#243428"
              strokeWidth={3}
            />

          </LineChart>

        </ResponsiveContainer>

      </div>

    </div>
  );
}