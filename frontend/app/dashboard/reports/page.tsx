"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SalesOverviewChart } from "@/features/reports/components/sales-overview-chart";
import { CustomerSalesChart } from "@/features/reports/components/customer-sales-chart";
import { CustomerFrequencyChart } from "@/features/reports/components/customer-frequency-chart";
import { ProductsChart } from "@/features/reports/components/products-chart";
import { EmployeeHoursChart } from "@/features/reports/components/employee-hours-chart";
import { WalkInStatsCard } from "@/features/reports/components/walk-in-stats-card";
import { WalkInTrendChart } from "@/features/reports/components/walk-in-trend-chart";
import { WalkInStats } from "@/features/reports/types";
import { Download, Loader2, Search } from "lucide-react";
import Link from "next/link";
import { useDashboardRealtime } from "@/lib/use-dashboard-realtime";
import {
  useOrders,
  useTopCustomers,
  useFrequentCustomers,
  useTopItems,
  useWalkInStats,
  useMonthlyHours,
  useInvalidateAll,
} from "@/lib/queries";

const MONTHS_ORDER = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function ReportsPage() {
  const [search, setSearch] = useState("");
  const [salesYear, setSalesYear] = useState(new Date().getFullYear().toString());
  const [freqYear, setFreqYear] = useState(new Date().getFullYear().toString());
  const [hoursYear, setHoursYear] = useState(new Date().getFullYear().toString());
  const [walkInYear, setWalkInYear] = useState(new Date().getFullYear().toString());

  const invalidateAll = useInvalidateAll();

  const { data: ordersRaw, isLoading: ordersLoading } = useOrders(parseInt(salesYear));
  const { data: topCustRaw, isLoading: topCustLoading } = useTopCustomers(parseInt(salesYear));
  const { data: freqCustRaw, isLoading: freqCustLoading } = useFrequentCustomers(parseInt(freqYear));
  const { data: topItemsRaw, isLoading: topItemsLoading } = useTopItems(parseInt(salesYear));
  const { data: walkInRaw, isLoading: walkInLoading } = useWalkInStats(parseInt(walkInYear));
  const { data: hoursRaw, isLoading: hoursLoading } = useMonthlyHours({ year: parseInt(hoursYear) });

  const loading =
    ordersLoading || topCustLoading || freqCustLoading || topItemsLoading || walkInLoading || hoursLoading;

  useDashboardRealtime(invalidateAll);

  // Process Sales Data (Monthly aggregation)
  const salesData = useMemo(() => {
    const orders = Array.isArray(ordersRaw) ? (ordersRaw as { createdAt: string; grandTotal: number }[]) : [];
    const monthlyData = orders.reduce((acc: { name: string; total: number }[], order) => {
      const month = new Date(order.createdAt).toLocaleString("default", { month: "short" });
      const amount = Number(order.grandTotal) || 0;
      const existing = acc.find((d) => d.name === month);
      if (existing) {
        existing.total += amount;
      } else {
        acc.push({ name: month, total: amount });
      }
      return acc;
    }, []);
    return [...monthlyData].sort((a, b) => MONTHS_ORDER.indexOf(a.name) - MONTHS_ORDER.indexOf(b.name));
  }, [ordersRaw]);

  // Top Customers by spend
  const topCustomers = useMemo(
    () =>
      (topCustRaw as { firstName: string; lastName: string; totalSpent: number }[] ?? []).map((c) => ({
        name: `${c.firstName} ${c.lastName}`,
        sales: c.totalSpent,
      })),
    [topCustRaw],
  );

  // Most frequent customers
  const frequentCustomers = useMemo(
    () =>
      (freqCustRaw as { firstName: string; lastName: string; visitCount: number }[] ?? []).map((c) => ({
        name: `${c.firstName} ${c.lastName}`,
        visits: c.visitCount,
      })),
    [freqCustRaw],
  );

  // Top items + total units sold
  const { topItems, totalUnitsSold } = useMemo(() => {
    const colors = ["#5bc0de", "#5cb85c", "#5b5ea6", "#f0ad4e", "#d9534f"];
    let units = 0;
    const items = (topItemsRaw as { name: string; totalSold: number }[] ?? []).map((i, index) => {
      units += i.totalSold;
      return { name: i.name, units: i.totalSold, color: colors[index % colors.length] };
    });
    return { topItems: items, totalUnitsSold: units };
  }, [topItemsRaw]);

  // Employee hours — always 12 months
  const hoursByMonth = useMemo(() => {
    const map = new Map<number, number>();
    for (const row of (hoursRaw as { month: number; totalHours: number }[] ?? [])) {
      map.set(Number(row.month), Number(row.totalHours || 0));
    }
    return MONTHS_ORDER.map((name, i) => ({
      name,
      total: Number((map.get(i + 1) || 0).toFixed(2)),
    }));
  }, [hoursRaw]);

  // Walk-in stats with safe fallback
  const walkInStats: WalkInStats = (walkInRaw as WalkInStats) ?? {
    totalWalkInOrders: 0,
    walkInRevenue: 0,
    avgWalkInOrderValue: 0,
    totalOrders: 0,
    walkInPercentage: 0,
    monthlyBreakdown: [],
  };

  const handleExport = () => {
    if (salesData.length === 0) return;

    const headers = ["Month", "Total Sales"];
    const rows = salesData.map((d) => [d.name, d.total.toFixed(2)]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers, ...rows].map((e) => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `sales_report_${salesYear}_${new Date().toISOString().split("T")[0]}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
      </div>
    );
  }

  return (
    <div className="space-y-4 w-full overflow-x-hidden p-2 md:p-6 bg-[#f8f9fa] dark:bg-dark-900 min-h-screen">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-xl md:text-2xl font-bold text-dark-900 dark:text-white">
            Reports & Analytics
          </h1>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Search Bar */}
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search Customer"
              className="pl-9 h-11 bg-white dark:bg-dark-800 border-none shadow-sm rounded-lg"
            />
          </div>

          <Link href="/dashboard/orders/new?type=delivery">
            <Button className="bg-[#189cd2] hover:bg-[#158bb9] text-white h-11 px-6 rounded-lg font-medium">
              Quickly Sell
            </Button>
          </Link>

          <Button
            variant="outline"
            onClick={handleExport}
            className="border-[#189cd2] text-[#189cd2] hover:bg-[#189cd2]/10 h-11 px-6 rounded-lg font-medium bg-white dark:bg-dark-800"
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Total Sales Overview */}
        <SalesOverviewChart
          data={salesData}
          year={salesYear}
          onYearChange={setSalesYear}
        />

        {/* Total Sales Per Customer */}
        <CustomerSalesChart data={topCustomers} />

        {/* Most Frequent Customers */}
        <CustomerFrequencyChart
          data={frequentCustomers}
          year={freqYear}
          onYearChange={setFreqYear}
        />

        {/* Most Purchased Items */}
        <ProductsChart data={topItems} totalUnits={totalUnitsSold} />

        {/* Employee Hours */}
        <EmployeeHoursChart
          data={hoursByMonth}
          year={hoursYear}
          onYearChange={setHoursYear}
        />

        {/* Walk-in Metrics — full-width KPI tiles */}
        <WalkInStatsCard stats={walkInStats} />

        {/* Walk-in Monthly Trend */}
        <WalkInTrendChart
          data={walkInStats.monthlyBreakdown}
          year={walkInYear}
          onYearChange={setWalkInYear}
        />
      </div>

      {/* Footer */}
      <div className="text-center text-sm text-[#545454] dark:text-dark-500 py-8">
        Copyright {new Date().getFullYear()} Water Shop. All Rights Reserved
      </div>
    </div>
  );
}