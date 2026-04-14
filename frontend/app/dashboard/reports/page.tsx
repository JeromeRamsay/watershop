"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Download, Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SalesOverviewChart } from "@/features/reports/components/sales-overview-chart";
import { CustomerSalesChart } from "@/features/reports/components/customer-sales-chart";
import { CustomerFrequencyChart } from "@/features/reports/components/customer-frequency-chart";
import { ProductsChart } from "@/features/reports/components/products-chart";
import { EmployeeHoursChart } from "@/features/reports/components/employee-hours-chart";
import { WalkInStatsCard } from "@/features/reports/components/walk-in-stats-card";
import { WalkInTrendChart } from "@/features/reports/components/walk-in-trend-chart";
import {
  DashboardStats,
  RefillOverrideStats,
  WalkInStats,
} from "@/features/reports/types";
import {
  useDashboardStats,
  useFrequentCustomers,
  useInvalidateAll,
  useMonthlyHours,
  useRefillOverrideStats,
  useTopCustomers,
  useTopItems,
  useWalkInStats,
} from "@/lib/queries";
import { useIsCurrentUserAdmin } from "@/lib/current-user";
import { useDashboardRealtime } from "@/lib/use-dashboard-realtime";

const MONTHS_ORDER = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function toDateInputValue(date: Date) {
  return date.toISOString().split("T")[0];
}

function formatCurrency(value: number) {
  return `$${Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatSignedValue(value: number) {
  const numeric = Number(value || 0);
  if (numeric > 0) return `+${numeric}`;
  return numeric.toString();
}

function buildHoursLabel(month: number, year?: number, includeYear = false) {
  const monthLabel = MONTHS_ORDER[Math.max(0, month - 1)] || `Month ${month}`;
  return includeYear && year ? `${monthLabel} ${year}` : monthLabel;
}

function MetricCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl bg-white dark:bg-dark-800 shadow-sm p-5 border border-transparent dark:border-dark-700">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-dark-400 dark:text-dark-300">
        {label}
      </p>
      <p className="mt-3 text-2xl font-bold text-dark-900 dark:text-white">
        {value}
      </p>
      {hint ? (
        <p className="mt-2 text-sm text-dark-500 dark:text-dark-400">{hint}</p>
      ) : null}
    </div>
  );
}

function TableCard({
  title,
  columns,
  rows,
  emptyLabel,
}: {
  title: string;
  columns: string[];
  rows: Array<Array<string | number>>;
  emptyLabel: string;
}) {
  return (
    <div className="rounded-2xl bg-white dark:bg-dark-800 shadow-sm p-5 border border-transparent dark:border-dark-700">
      <h3 className="text-lg font-bold text-dark-900 dark:text-white mb-4">
        {title}
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px]">
          <thead>
            <tr className="border-b border-dark-200 dark:border-dark-600 text-left">
              {columns.map((column) => (
                <th
                  key={column}
                  className="py-2 pr-4 text-xs font-semibold uppercase tracking-wide text-dark-500 dark:text-dark-300"
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length ? (
              rows.map((row, rowIndex) => (
                <tr
                  key={`${title}-${rowIndex}`}
                  className="border-b border-dark-100 dark:border-dark-700 last:border-0"
                >
                  {row.map((cell, cellIndex) => (
                    <td
                      key={`${title}-${rowIndex}-${cellIndex}`}
                      className="py-3 pr-4 text-sm text-dark-700 dark:text-dark-200"
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td
                  className="py-6 text-sm text-dark-500 dark:text-dark-400"
                  colSpan={columns.length}
                >
                  {emptyLabel}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function ReportsPage() {
  const today = useMemo(() => new Date(), []);
  const isAdmin = useIsCurrentUserAdmin();
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState(
    toDateInputValue(new Date(today.getFullYear(), today.getMonth(), 1)),
  );
  const [toDate, setToDate] = useState(toDateInputValue(today));

  const queryParams = useMemo(
    () => ({
      from: fromDate || undefined,
      to: toDate || undefined,
    }),
    [fromDate, toDate],
  );

  const invalidateAll = useInvalidateAll();
  useDashboardRealtime(invalidateAll);

  const { data: statsRaw, isLoading: statsLoading } = useDashboardStats(queryParams);
  const { data: topCustRaw, isLoading: topCustLoading } = useTopCustomers(queryParams);
  const { data: freqCustRaw, isLoading: freqCustLoading } = useFrequentCustomers(queryParams);
  const { data: topItemsRaw, isLoading: topItemsLoading } = useTopItems(queryParams);
  const { data: walkInRaw, isLoading: walkInLoading } = useWalkInStats(queryParams);
  const { data: hoursRaw, isLoading: hoursLoading } = useMonthlyHours(queryParams);
  const { data: overrideRaw, isLoading: overrideLoading } = useRefillOverrideStats(queryParams);

  const loading =
    statsLoading ||
    topCustLoading ||
    freqCustLoading ||
    topItemsLoading ||
    walkInLoading ||
    hoursLoading ||
    overrideLoading;

  const stats: DashboardStats =
    (statsRaw as DashboardStats) ?? {
      totalRevenue: 0,
      totalOrders: 0,
      avgOrderValue: 0,
      todayRevenue: 0,
      todayOrders: 0,
      todayDeliveryOrders: 0,
      todayPrepaidOrders: 0,
      uniqueCustomersServed: 0,
      repeatCustomers: 0,
      repeatCustomerRate: 0,
      deliveryOrders: 0,
      walkInOrders: 0,
      walkInPercentage: 0,
      prepaidRedemptions: 0,
      refillCount: 0,
      salesTrend: [],
    };

  const walkInStats: WalkInStats =
    (walkInRaw as WalkInStats) ?? {
      totalWalkInOrders: 0,
      walkInRevenue: 0,
      avgWalkInOrderValue: 0,
      totalOrders: 0,
      walkInPercentage: 0,
      monthlyBreakdown: [],
    };

  const overrideStats: RefillOverrideStats =
    (overrideRaw as RefillOverrideStats) ?? {
      summary: {
        totalOverrides: 0,
        quantityDelta: 0,
        positiveQuantityDelta: 0,
        negativeQuantityDelta: 0,
        usersAffected: 0,
        customersAffected: 0,
      },
      byUser: [],
      byCustomer: [],
      byUserCustomer: [],
    };
  const overrideStatsUnavailable = Boolean(overrideStats.isUnavailable);
  const overrideUnavailableLabel =
    "Refill override analytics are temporarily unavailable on this environment. Redeploy the backend to enable this section.";

  const searchLower = search.trim().toLowerCase();

  const salesData = useMemo(
    () =>
      (stats.salesTrend || []).map((point) => ({
        name: point.label,
        total: Number(point.revenue || 0),
      })),
    [stats.salesTrend],
  );

  const topCustomers = useMemo(() => {
    const rows = (topCustRaw as { firstName?: string; lastName?: string; totalSpent: number }[] ?? []).map(
      (customer) => ({
        name: `${customer.firstName || ""} ${customer.lastName || ""}`.trim() || "Walk-in / Unassigned",
        sales: Number(customer.totalSpent || 0),
      }),
    );

    if (!searchLower) return rows;
    return rows.filter((row) => row.name.toLowerCase().includes(searchLower));
  }, [topCustRaw, searchLower]);

  const frequentCustomers = useMemo(() => {
    const rows = (freqCustRaw as { firstName?: string; lastName?: string; visitCount: number }[] ?? []).map(
      (customer) => ({
        name: `${customer.firstName || ""} ${customer.lastName || ""}`.trim() || "Walk-in / Unassigned",
        visits: Number(customer.visitCount || 0),
      }),
    );

    if (!searchLower) return rows;
    return rows.filter((row) => row.name.toLowerCase().includes(searchLower));
  }, [freqCustRaw, searchLower]);

  const { topItems, totalUnitsSold } = useMemo(() => {
    const colors = ["#5bc0de", "#5cb85c", "#5b5ea6", "#f0ad4e", "#d9534f"];
    let units = 0;

    const items = (topItemsRaw as { name: string; totalSold: number }[] ?? []).map(
      (item, index) => {
        const totalSold = Number(item.totalSold || 0);
        units += totalSold;
        return {
          name: item.name,
          units: totalSold,
          color: colors[index % colors.length],
        };
      },
    );

    return { topItems: items, totalUnitsSold: units };
  }, [topItemsRaw]);

  const hoursByMonth = useMemo(() => {
    const rows = (hoursRaw as { year?: number; month: number; totalHours: number }[] ?? []);
    const distinctYears = new Set(rows.map((row) => Number(row.year || 0)).filter(Boolean));
    const includeYear = distinctYears.size > 1;

    return rows.map((row) => ({
      name: buildHoursLabel(Number(row.month || 0), row.year, includeYear),
      total: Number(Number(row.totalHours || 0).toFixed(2)),
    }));
  }, [hoursRaw]);

  const filteredOverrideByUser = useMemo(() => {
    if (!searchLower) return overrideStats.byUser;
    return overrideStats.byUser.filter((row) =>
      `${row.firstName || ""} ${row.lastName || ""} ${row.username || ""}`
        .toLowerCase()
        .includes(searchLower),
    );
  }, [overrideStats.byUser, searchLower]);

  const filteredOverrideByCustomer = useMemo(() => {
    if (!searchLower) return overrideStats.byCustomer;
    return overrideStats.byCustomer.filter((row) =>
      `${row.firstName || ""} ${row.lastName || ""} ${row.email || ""} ${row.phone || ""}`
        .toLowerCase()
        .includes(searchLower),
    );
  }, [overrideStats.byCustomer, searchLower]);

  const filteredOverrideByUserCustomer = useMemo(() => {
    if (!searchLower) return overrideStats.byUserCustomer;
    return overrideStats.byUserCustomer.filter((row) =>
      `${row.userFirstName || ""} ${row.userLastName || ""} ${row.username || ""} ${row.customerFirstName || ""} ${row.customerLastName || ""}`
        .toLowerCase()
        .includes(searchLower),
    );
  }, [overrideStats.byUserCustomer, searchLower]);

  const handleExport = () => {
    const lines = [
      ["Metric", "Value"],
      ["Total Revenue", stats.totalRevenue.toFixed(2)],
      ["Total Orders", stats.totalOrders.toString()],
      ["Average Order Value", stats.avgOrderValue.toFixed(2)],
      ["Unique Customers", stats.uniqueCustomersServed.toString()],
      ["Repeat Customers", stats.repeatCustomers.toString()],
      ["Repeat Customer Rate", `${stats.repeatCustomerRate}%`],
      ["Delivery Orders", stats.deliveryOrders.toString()],
      ["Walk-In Orders", stats.walkInOrders.toString()],
      ["Walk-In Share", `${stats.walkInPercentage}%`],
      ["Prepaid Redemptions", stats.prepaidRedemptions.toString()],
      ["Refill Count", stats.refillCount.toString()],
      ["Manual Overrides", overrideStats.summary.totalOverrides.toString()],
      ["Override Net Delta", overrideStats.summary.quantityDelta.toString()],
      [],
      ["Sales Trend Label", "Revenue", "Orders"],
      ...stats.salesTrend.map((point) => [
        point.label,
        point.revenue.toFixed(2),
        point.orders.toString(),
      ]),
    ];

    const csvContent =
      "data:text/csv;charset=utf-8," +
      lines.map((line) => line.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `reports_${fromDate || "start"}_${toDate || "end"}.csv`,
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
    <div className="space-y-6 w-full overflow-x-hidden p-2 md:p-6 bg-[#f8f9fa] dark:bg-dark-900 min-h-screen">
      <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-dark-900 dark:text-white">
            Reports & Analytics
          </h1>
          <p className="mt-1 text-sm text-dark-500 dark:text-dark-400">
            Review performance for the selected date range, including customer activity, delivery trends, prepaid redemptions, and manual refill overrides.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
          <div className="flex items-center gap-2 rounded-xl bg-white dark:bg-dark-800 px-3 py-2 shadow-sm">
            <span className="text-xs font-semibold uppercase tracking-wide text-dark-400 dark:text-dark-300">
              From
            </span>
            <Input
              type="date"
              value={fromDate}
              onChange={(event) => setFromDate(event.target.value)}
              className="border-none shadow-none h-9 p-0"
            />
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-white dark:bg-dark-800 px-3 py-2 shadow-sm">
            <span className="text-xs font-semibold uppercase tracking-wide text-dark-400 dark:text-dark-300">
              To
            </span>
            <Input
              type="date"
              value={toDate}
              onChange={(event) => setToDate(event.target.value)}
              className="border-none shadow-none h-9 p-0"
            />
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search customer or staff"
              className="pl-9 h-11 bg-white dark:bg-dark-800 border-none shadow-sm rounded-lg"
            />
          </div>
          <Link href="/dashboard/orders/new?type=delivery">
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white h-11 px-6 rounded-lg font-medium">
              + Add New Order
            </Button>
          </Link>
          {isAdmin ? (
            <Button
              variant="outline"
              onClick={handleExport}
              className="border-[#189cd2] text-[#189cd2] hover:bg-[#189cd2]/10 h-11 px-6 rounded-lg font-medium bg-white dark:bg-dark-800"
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        <MetricCard
          label="Total Revenue"
          value={formatCurrency(stats.totalRevenue)}
          hint="All paid and pending order value in range"
        />
        <MetricCard
          label="Total Orders"
          value={stats.totalOrders.toString()}
          hint={`${stats.deliveryOrders} delivery orders`}
        />
        <MetricCard
          label="Average Order Value"
          value={formatCurrency(stats.avgOrderValue)}
          hint={`${stats.prepaidRedemptions} prepaid redemptions`}
        />
        <MetricCard
          label="Unique Customers"
          value={stats.uniqueCustomersServed.toString()}
          hint={`${stats.repeatCustomers} repeat customers`}
        />
        <MetricCard
          label="Repeat Rate"
          value={`${stats.repeatCustomerRate}%`}
          hint="Repeat customers / unique customers"
        />
        <MetricCard
          label="Walk-In Orders"
          value={stats.walkInOrders.toString()}
          hint={`${stats.walkInPercentage}% of all orders`}
        />
        <MetricCard
          label="Refill Count"
          value={stats.refillCount.toString()}
          hint="Units redeemed or sold as refills"
        />
        <MetricCard
          label="Manual Overrides"
          value={
            overrideStatsUnavailable
              ? "--"
              : overrideStats.summary.totalOverrides.toString()
          }
          hint={
            overrideStatsUnavailable
              ? "Waiting for a backend deploy that includes refill override analytics"
              : `${formatSignedValue(overrideStats.summary.quantityDelta)} net quantity delta`
          }
        />
        <MetricCard
          label="Override Users"
          value={
            overrideStatsUnavailable
              ? "--"
              : overrideStats.summary.usersAffected.toString()
          }
          hint={
            overrideStatsUnavailable
              ? "This metric will populate after the backend route is live"
              : `${overrideStats.summary.customersAffected} customers affected`
          }
        />
        <MetricCard
          label="Revenue Today"
          value={formatCurrency(stats.todayRevenue)}
          hint={`${stats.todayOrders} orders today`}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SalesOverviewChart data={salesData} />
        <CustomerSalesChart data={topCustomers} />
        <CustomerFrequencyChart data={frequentCustomers} />
        <ProductsChart data={topItems} totalUnits={totalUnitsSold} />
        <EmployeeHoursChart data={hoursByMonth} />
        <WalkInStatsCard stats={walkInStats} />
        <WalkInTrendChart data={walkInStats.monthlyBreakdown} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {overrideStatsUnavailable ? (
          <div className="xl:col-span-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {overrideUnavailableLabel}
          </div>
        ) : null}

        <TableCard
          title="Refill Overrides by User"
          columns={["User", "Overrides", "Net Delta", "Customers"]}
          rows={filteredOverrideByUser.map((row) => [
            `${row.firstName || ""} ${row.lastName || ""}`.trim() || row.username || row.userId,
            row.overrideCount,
            formatSignedValue(row.quantityDelta),
            row.customersAffected,
          ])}
          emptyLabel={
            overrideStatsUnavailable
              ? overrideUnavailableLabel
              : "No refill overrides found for this range."
          }
        />

        <TableCard
          title="Refill Overrides by Customer"
          columns={["Customer", "Overrides", "Net Delta", "Users"]}
          rows={filteredOverrideByCustomer.map((row) => [
            `${row.firstName || ""} ${row.lastName || ""}`.trim() || row.customerId,
            row.overrideCount,
            formatSignedValue(row.quantityDelta),
            row.usersAffected,
          ])}
          emptyLabel={
            overrideStatsUnavailable
              ? overrideUnavailableLabel
              : "No customer override activity found for this range."
          }
        />

        <TableCard
          title="Overrides by User + Customer"
          columns={["User", "Customer", "Overrides", "Net Delta"]}
          rows={filteredOverrideByUserCustomer.map((row) => [
            `${row.userFirstName || ""} ${row.userLastName || ""}`.trim() || row.username || row.userId,
            `${row.customerFirstName || ""} ${row.customerLastName || ""}`.trim() || row.customerId,
            row.overrideCount,
            formatSignedValue(row.quantityDelta),
          ])}
          emptyLabel={
            overrideStatsUnavailable
              ? overrideUnavailableLabel
              : "No paired override activity found for this range."
          }
        />
      </div>

      <div className="text-center text-sm text-[#545454] dark:text-dark-500 py-8">
        Copyright {new Date().getFullYear()} Water Shop. All Rights Reserved
      </div>
    </div>
  );
}