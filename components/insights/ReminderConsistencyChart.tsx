"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function ReminderConsistencyChart({
  reminderData = [],
}: any) {

  return (

    <div className="rounded-[32px] border bg-white p-8 shadow-sm">

      {/* HEADER */}

      <div className="mb-8">

        <h2 className="text-4xl font-bold text-[#243428]">
          Reminder Consistency
        </h2>

        <p className="text-gray-500 mt-2">
          Weekly cognitive routine adherence.
        </p>

      </div>

      {/* CHART */}

      <div className="h-[400px]">

        <ResponsiveContainer
          width="100%"
          height="100%"
        >

          <BarChart data={reminderData}>

            <XAxis dataKey="week" />

            <YAxis />

            <Tooltip />

            <Bar
              dataKey="completed"
              fill="#243428"
              radius={[10, 10, 0, 0]}
            />

          </BarChart>

        </ResponsiveContainer>

      </div>

    </div>
  );
}