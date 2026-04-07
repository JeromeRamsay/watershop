"use client";

import { UserX, ShoppingCart, DollarSign, TrendingUp } from "lucide-react";
import { WalkInStats } from "../types";

interface WalkInStatsCardProps {
  stats: WalkInStats;
}

export function WalkInStatsCard({ stats }: WalkInStatsCardProps) {
  const tiles = [
    {
      icon: ShoppingCart,
      label: "Walk-in Orders",
      value: stats.totalWalkInOrders.toLocaleString(),
      color: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-50 dark:bg-amber-900/20",
    },
    {
      icon: DollarSign,
      label: "Walk-in Revenue",
      value: `$${stats.walkInRevenue.toFixed(2)}`,
      color: "text-green-600 dark:text-green-400",
      bg: "bg-green-50 dark:bg-green-900/20",
    },
    {
      icon: TrendingUp,
      label: "Avg Order Value",
      value: `$${stats.avgWalkInOrderValue.toFixed(2)}`,
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-50 dark:bg-blue-900/20",
    },
    {
      icon: UserX,
      label: "% of All Orders",
      value: `${stats.walkInPercentage}%`,
      color: "text-purple-600 dark:text-purple-400",
      bg: "bg-purple-50 dark:bg-purple-900/20",
    },
  ];

  return (
    <div className="bg-white dark:bg-dark-800 rounded-2xl border-none shadow-sm p-6 lg:col-span-2">
      <div className="flex items-center gap-3 mb-6">
        <UserX className="h-5 w-5 text-amber-500" />
        <h3 className="text-lg font-bold text-dark-900 dark:text-white">
          Walk-in Customer Metrics
        </h3>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {tiles.map(({ icon: Icon, label, value, color, bg }) => (
          <div key={label} className={`${bg} rounded-xl p-4 flex flex-col gap-2`}>
            <div className={`flex items-center gap-2 ${color}`}>
              <Icon className="h-4 w-4" />
              <span className="text-xs font-medium">{label}</span>
            </div>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

