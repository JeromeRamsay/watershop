"use client";

import { useCallback } from "react";
import { WelcomeSection } from "@/features/dashboard/components/welcome-section";
import { MetricCard } from "@/features/dashboard/components/metric-card";
import { InventoryStatus } from "@/features/dashboard/components/inventory-status";
import { QuickActions } from "@/features/dashboard/components/quick-actions";
import { Notifications } from "@/features/dashboard/components/notifications";
import { RecentTransactions } from "@/features/dashboard/components/recent-transactions";
import { UpcomingDeliveries } from "@/features/dashboard/components/upcoming-deliveries";
import {
  DollarSign,
  Package,
  Box,
  ShoppingCart,
  Loader2,
  AlertTriangle,
  Clock3,
} from "lucide-react";
import Cookies from "js-cookie";
import { useDashboardRealtime } from "@/lib/use-dashboard-realtime";
import {
  useDashboardStats,
  useInventory,
  useOrders,
  useDeliveries,
  useNotifications,
  useEmployeeHours,
  useHoursSummary,
} from "@/lib/queries";
import { useQueryClient } from "@tanstack/react-query";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function timeAgo(date: string | Date) {
  if (!date) return "Unknown time";
  const now = new Date();
  const past = new Date(date);
  const diffInMs = now.getTime() - past.getTime();
  const seconds = Math.floor(diffInMs / 1000);
  if (seconds < 60) return "Just Now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return past.toLocaleDateString();
}

export default function DashboardPage() {
  const userInfo = (() => {
    try { return JSON.parse(Cookies.get("user_info") || "{}"); } catch { return {}; }
  })();
  const userName = userInfo?.name || "Admin";
  const userRole = userInfo?.role || "admin";
  const userId   = userInfo?.id;
  const isStaff  = userRole === "staff";

  // Week range for staff hours
  const weekStart = (() => {
    const d = new Date(); const day = d.getDay();
    d.setDate(d.getDate() - day + (day === 0 ? -6 : 1)); d.setHours(0,0,0,0); return d;
  })();
  const weekEnd = new Date(weekStart); weekEnd.setDate(weekStart.getDate() + 6); weekEnd.setHours(23,59,59,999);

  // ── All data via React Query (cached, background-refreshed) ──────────────
  const { data: stats,         isLoading: l1 } = useDashboardStats();
  const { data: inventoryData, isLoading: l2 } = useInventory();
  const { data: ordersData,    isLoading: l3 } = useOrders();
  const { data: deliveriesData,isLoading: l4 } = useDeliveries();
  const { data: notifData,     isLoading: l5 } = useNotifications();

  const { data: weekSummaryData } = useHoursSummary(
    isStaff && userId ? { userId, from: weekStart.toISOString(), to: weekEnd.toISOString() } : {}
  );
  const { data: recentHoursData } = useEmployeeHours(
    isStaff && userId ? { userId } : {}
  );

  const loading = l1 || l2 || l3 || l4 || l5;

  // ── Realtime: invalidate all cached queries on WS push ───────────────────
  const qc = useQueryClient();
  useDashboardRealtime(useCallback(() => {
    void qc.invalidateQueries();
  }, [qc]));

  // ── Derived data ─────────────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const orders: any[] = ordersData ?? [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rentalOrdersCount  = orders.filter((o: any) => o.isDelivery === true).length;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const prePurchasesCount  = orders.filter((o: any) => o.isPrepaidRedemption).length;

  const metrics = {
    totalRevenue: stats?.totalRevenue ?? 0,
    totalOrders:  stats?.totalOrders  ?? 0,
    rentalOrders: rentalOrdersCount,
    prePurchases: prePurchasesCount,
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const inventory = (inventoryData as any[] ?? []).map((item: any) => {
    const qty = Number(item.stockQuantity);
    const status: "In Stock" | "Low Stock" | "Out of Stock" =
      qty === 0 ? "Out of Stock" : qty < 10 ? "Low Stock" : "In Stock";
    return { id: String(item._id), product: String(item.name), stockLeft: qty, status };
  }).slice(0, 5);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const transactions = ([...orders] as any[])
    .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((order: any) => {
      const status: "Paid" | "Pending" = order.paymentStatus === "paid" ? "Paid" : "Pending";
      return {
        id: String(order._id),
        customer: order.customer ? `${String(order.customer.firstName)} ${String(order.customer.lastName || "")}` : "Unknown",
        itemsPurchased: order.items?.length ? `${order.items.length} ${order.items.length === 1 ? "Item" : "Items"}` : "No Items",
        total: Number(order.grandTotal) || 0,
        status,
        date: new Date(String(order.createdAt)).toLocaleDateString(),
      };
    });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const deliveries = (deliveriesData as any[] ?? [])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .filter((d: any) => d.status !== "delivered" && d.status !== "cancelled")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .sort((a: any, b: any) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime())
    .slice(0, 5)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((d: any) => ({
      id: d._id,
      customer: d.customer ? `${d.customer.firstName} ${d.customer.lastName || ""}` : "Unknown",
      address: d.address?.street || "No address",
      dateTime: new Date(d.scheduledDate).toLocaleString(),
      status: d.status.charAt(0).toUpperCase() + d.status.slice(1).toLowerCase(),
    }));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const notificationsList = (notifData as any[] ?? []).map((n: any) => ({
    id: n._id,
    message: n.message,
    timestamp: timeAgo(n.createdAt || new Date()),
    icon: AlertTriangle,
  }));

  const myWeekHours = Number(weekSummaryData?.[0]?.totalHours ?? 0);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const myRecentHours: { id: string; date: string; hours: number; notes?: string }[] =
    (recentHoursData as any[] ?? []).slice(0, 4).map((entry: any) => ({
    id: entry._id,
    date: entry.workDate,
    hours: Number(entry.hours || 0),
    notes: entry.notes,
  }));

  const quickActions = [
    { id: "1", label: "New Order",     href: "/dashboard/orders/new",  icon: Package },
    { id: "2", label: "Add Customer",  href: "/dashboard/customers",   icon: Box },
    { id: "3", label: "Inventory",     href: "/dashboard/inventory",   icon: ShoppingCart },
    { id: "5", label: "Enter Hours",   href: "/dashboard/hours",       icon: Clock3 },
    ...(isStaff ? [] : [{ id: "4", label: "Settings", href: "/dashboard/settings", icon: DollarSign }]),
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
      </div>
    );
  }

  return (    <div className="space-y-2 md:space-y-3 w-full overflow-x-hidden">
      <WelcomeSection userName={userName} />

      {/* KPI Cards */}
      <div
        className={`grid gap-2 sm:gap-3 grid-cols-2 md:grid-cols-2 ${
          userRole === "staff" ? "lg:grid-cols-3" : "lg:grid-cols-4"
        }`}
      >
        {userRole !== "staff" ? (
          <MetricCard
            title="Total Sales"
            value={`$${metrics.totalRevenue.toFixed(2)}`}
            icon={DollarSign}
            iconColor="text-primary-600"
            iconBg="bg-primary-100"
          />
        ) : null}
        <MetricCard
          title="Orders Processed"
          value={metrics.totalOrders.toString()}
          icon={Package}
          iconColor="text-green-600"
          iconBg="bg-green-100"
        />
        <MetricCard
          title="Rental Orders"
          value={metrics.rentalOrders.toString()}
          icon={Box}
          iconColor="text-red-600"
          iconBg="bg-red-100"
        />
        <MetricCard
          title="Pre-Purchases"
          value={metrics.prePurchases.toString()}
          icon={ShoppingCart}
          iconColor="text-orange-600"
          iconBg="bg-orange-100"
        />
      </div>

      {/* Middle Section - 3 Columns */}
      <div className="grid gap-3 grid-cols-1 md:grid-cols-12 items-stretch">
        <div className="md:col-span-5 flex">
          <InventoryStatus items={inventory} />
        </div>
        <div className="md:col-span-3 flex">
          <QuickActions actions={quickActions} />
        </div>
        <div className="md:col-span-4 flex">
          <Notifications notifications={notificationsList} />
        </div>
      </div>

      {/* Bottom Section - 2 Columns */}
      {userRole === "staff" ? (
        <div className="grid gap-3 grid-cols-1 md:grid-cols-12">
          <div className="md:col-span-5">
            <UpcomingDeliveries deliveries={deliveries} />
          </div>
          <div className="md:col-span-3 bg-white dark:bg-dark-700 rounded-xl border border-dark-200 dark:border-dark-600 shadow-sm p-4">
            <h3 className="text-sm font-semibold text-dark-900 dark:text-white">My Hours This Week</h3>
            <p className="text-3xl font-bold text-primary-600 mt-2">{myWeekHours.toFixed(2)}h</p>
            <p className="text-xs text-dark-500 mt-2">Keep logging daily hours from the Hours page.</p>
          </div>
          <div className="md:col-span-4 bg-white dark:bg-dark-700 rounded-xl border border-dark-200 dark:border-dark-600 shadow-sm p-4">
            <h3 className="text-sm font-semibold text-dark-900 dark:text-white mb-2">Recent Logged Hours</h3>
            <div className="space-y-2">
              {myRecentHours.length > 0 ? (
                myRecentHours.map((entry: { id: string; date: string; hours: number; notes?: string }) => (
                  <div key={entry.id} className="flex justify-between text-xs border-b border-dark-200 dark:border-dark-600 pb-1">
                    <span>{new Date(entry.date).toLocaleDateString()}</span>
                    <span className="font-semibold">{entry.hours.toFixed(2)}h</span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-dark-500">No hour entries yet.</p>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          <RecentTransactions transactions={transactions} />
          <UpcomingDeliveries deliveries={deliveries} />
        </div>
      )}

      {/* Footer */}
      <div className="text-end text-xs text-[#545454] dark:text-dark-500 py-2">
        Copyright {new Date().getFullYear()} Water Shop. All Rights Reserved
      </div>
    </div>
  );
}
