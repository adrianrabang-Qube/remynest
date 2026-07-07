
"use client";

import { memo } from "react";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

type CategoryDatum = {
  name?: string;
  value?: number;
};

const MoodDistributionChart = memo(
  function MoodDistributionChart({
    categoryData = [],
  }: {
    categoryData?: CategoryDatum[];
  }) {

  // =====================================
  // PRODUCTION COLOR SYSTEM
  // =====================================

  const colors = [
    "#243428",
    "#8d9b8f",
    "#c9b9a6",
    "#b8c1ae",
    "#d9d2c7",
    "#74806f",
    "#a7b2a0",
    "#d4c8ba",
  ];

  return (

    <div className="rounded-[32px] border bg-white p-8 shadow-sm">

      {/* HEADER */}

      <div className="mb-8">

        <h2 className="text-4xl font-bold text-[#243428]">
          Memory Categories
        </h2>

        <p className="text-gray-500 mt-2">
          Distribution of your memory types.
        </p>

      </div>

      {/* PIE CHART */}

      <div className="h-[420px]">

        <ResponsiveContainer
          width="100%"
          height="100%"
        >

          <PieChart>

            <Pie
              data={categoryData}
              dataKey="value"
              nameKey="name"
              innerRadius={70}
              outerRadius={130}
              paddingAngle={2}
            >

              {categoryData.map(
                (
                  _: CategoryDatum,
                  index: number
                ) => (

                  <Cell
                    key={index}
                    fill={
                      colors[
                        index %
                        colors.length
                      ]
                    }
                  />
                )
              )}

            </Pie>

            <Tooltip />

          </PieChart>

        </ResponsiveContainer>

      </div>

    </div>
  );
  }
);

export default MoodDistributionChart;