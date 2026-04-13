"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface CustomerFrequencyChartProps {
  data: { name: string; visits: number }[];
}

export function CustomerFrequencyChart({ data }: CustomerFrequencyChartProps) {

  // Calculate the maximum value from the data (fallback to 0 to avoid -Infinity on empty data)
  const maxValue = Math.max(0, ...data.map((item) => item.visits));

  // Set the Y-axis domain with a 50% buffer above the max value
  const yAxisMax = Math.ceil(maxValue * 1.5) || 100;

  // Generate ticks dynamically (6 ticks including 0)
  const tickCount = 6;
  const tickInterval = yAxisMax / (tickCount - 1);
  const ticks = [...new Set(Array.from({ length: tickCount }, (_, i) => Math.round(i * tickInterval)))];

  return (
    <div className="bg-white dark:bg-dark-800 rounded-2xl border-none shadow-sm p-6">
      <div className="flex items-center justify-between mb-8">
        <h3 className="text-lg font-bold text-dark-900 dark:text-white">
          Most Frequent Customers
        </h3>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart
          data={data}
          margin={{ top: 5, right: 10, left: -20, bottom: 0 }}
        >
          <CartesianGrid
            vertical={false}
            stroke="#f1f1f1"
            strokeDasharray="0"
          />
          <XAxis
            dataKey="name"
            stroke="#94a3b8"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            dy={10}
          />
          <YAxis
            stroke="#94a3b8"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            domain={[0, yAxisMax]}
            ticks={ticks}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "white",
              border: "none",
              borderRadius: "12px",
              boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
              padding: "12px",
            }}
            itemStyle={{ color: "#189cd2", fontWeight: 600 }}
            formatter={(value: number | undefined) => [value ?? 0, "Orders"]}
          />
          <Bar
            dataKey="visits"
            fill="#189cd2"
            radius={[4, 4, 0, 0]}
            barSize={24}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
