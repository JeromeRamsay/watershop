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
interface CustomerSalesChartProps {
  data: { name: string; sales: number }[];
}

export function CustomerSalesChart({ data }: CustomerSalesChartProps) {
  // Calculate the maximum value from the data (fallback to 0 to avoid -Infinity on empty data)
  const maxValue = Math.max(0, ...data.map((item) => item.sales));

  // Set the Y-axis domain with a 50% buffer above the max value
  const yAxisMax = Math.ceil(maxValue * 1.5) || 100;

  // Generate ticks dynamically
  const tickCount = 6;
  const tickInterval = yAxisMax / (tickCount - 1);
  const ticks = [...new Set(Array.from({ length: tickCount }, (_, i) => Math.round(i * tickInterval)))];

  return (
    <div className="bg-white dark:bg-dark-800 rounded-2xl border-none shadow-sm p-6">
      <h3 className="text-lg font-bold text-dark-900 dark:text-white mb-8">
        Total Sales Per Customer (Top 5)
      </h3>
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
            tickFormatter={(value) => `$${value}`}
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
            formatter={(value: any) => [
              `$${Number(value || 0).toLocaleString()}`,
              "Sales",
            ]}
          />
          <Bar
            dataKey="sales"
            fill="#189cd2"
            radius={[4, 4, 0, 0]}
            barSize={24}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
