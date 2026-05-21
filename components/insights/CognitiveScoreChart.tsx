"use client";

import {
  RadialBarChart,
  RadialBar,
  ResponsiveContainer,
} from "recharts";

export default function CognitiveScoreChart({
  cognitionScore,
}: any) {

  const data = [
    {
      name: "score",
      value: cognitionScore,
    },
  ];

  return (

    <div className="rounded-[32px] border bg-white p-8 shadow-sm">

      {/* HEADER */}

      <div className="mb-8">

        <h2 className="text-4xl font-bold text-[#243428]">
          Cognitive Score
        </h2>

        <p className="text-gray-500 mt-2">
          Real-time cognition continuity telemetry.
        </p>

      </div>

      {/* SCORE */}

      <div className="h-[350px] flex items-center justify-center">

        <ResponsiveContainer
          width="100%"
          height="100%"
        >

          <RadialBarChart
            innerRadius="70%"
            outerRadius="100%"
            data={data}
            startAngle={180}
            endAngle={0}
          >

            <RadialBar
              dataKey="value"
              cornerRadius={20}
              fill="#243428"
            />

          </RadialBarChart>

        </ResponsiveContainer>

        <div className="absolute flex flex-col items-center">

          <span className="text-6xl font-bold text-[#243428]">
            {cognitionScore}
          </span>

          <span className="text-gray-500 mt-2">
            Cognitive Stability
          </span>

        </div>

      </div>

    </div>
  );
}