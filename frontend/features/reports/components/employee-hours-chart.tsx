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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface EmployeeHoursChartProps {
  data: { name: string; total: number }[];
  year: string;
  onYearChange: (year: string) => void;
}

export function EmployeeHoursChart({
  data,
  year,
  onYearChange,
}: EmployeeHoursChartProps) {
  const years = [0, 1, 2, 3].map((offset) =>
    (new Date().getFullYear() - offset).toString(),
  );

  const maxValue = Math.max(1, ...data.map((item) => item.total));
  const yAxisMax = Math.ceil(maxValue * 1.3);
  const tickCount = 6;
  const tickInterval = yAxisMax / (tickCount - 1);
  const ticks = [...new Set(Array.from({ length: tickCount }, (_, i) => Math.round(i * tickInterval)))];

  return (
    <div className="bg-white dark:bg-dark-800 rounded-2xl border-none shadow-sm p-6">
      <div className="flex items-center justify-between mb-8">
        <h3 className="text-lg font-bold text-dark-900 dark:text-white">
          Employee Hours by Month
        </h3>
        <Select value={year} onValueChange={onYearChange}>
          <SelectTrigger className="w-24 h-9 text-sm bg-white dark:bg-dark-700 border-[#e5e7eb] dark:border-dark-600 rounded-lg">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {years.map((y) => (
              <SelectItem key={y} value={y}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="#f1f1f1" strokeDasharray="0" />
          <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} dy={10} />
          <YAxis
            stroke="#94a3b8"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            domain={[0, yAxisMax]}
            ticks={ticks}
            tickFormatter={(value) => `${value}h`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "white",
              border: "none",
              borderRadius: "12px",
              boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
              padding: "12px",
            }}
            itemStyle={{ color: "#16a34a", fontWeight: 600 }}
            formatter={(value: number | undefined) => [`${(value ?? 0).toFixed(1)}h`, "Hours"]}
          />
          <Bar dataKey="total" fill="#16a34a" radius={[4, 4, 0, 0]} barSize={24} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
