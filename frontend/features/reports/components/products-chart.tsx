"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

interface ProductsChartProps {
  data: { name: string; units: number; color: string }[];
  totalUnits: number;
}

export function ProductsChart({ data, totalUnits }: ProductsChartProps) {
  return (
    <div className="bg-white dark:bg-dark-800 rounded-2xl border-none shadow-sm p-6 h-full">
      <h3 className="text-lg font-bold text-dark-900 dark:text-white mb-8">
        Most Purchased Items
      </h3>
      <div className="flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="relative w-full max-w-[240px]">
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={100}
                innerRadius={65}
                paddingAngle={2}
                dataKey="units"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "white",
                  border: "none",
                  borderRadius: "12px",
                  boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                  padding: "12px",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          {/* Center Label */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center">
              <p className="text-2xl font-bold text-dark-900 dark:text-white">
                {totalUnits.toLocaleString()}
              </p>
              <p className="text-[10px] uppercase tracking-wider text-dark-500 font-medium">
                Total Units Sold
              </p>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex-1 w-full">
          <div className="space-y-4">
            {data.map((item, index) => (
              <div
                key={index}
                className="flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                  <p className="text-sm text-dark-600 dark:text-dark-300 font-medium truncate max-w-[150px]">
                    {item.name}
                  </p>
                </div>
                <p className="text-sm font-bold text-dark-900 dark:text-white">
                  {item.units.toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
