"use client";

import { useEffect, useState, useCallback } from "react";
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
import api from "@/lib/api";
import Cookies from "js-cookie";
import { useDashboardRealtime } from "@/lib/use-dashboard-realtime";

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
  const [metrics, setMetrics] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    rentalOrders: 0,
    prePurchases: 0,
  });
  const [inventory, setInventory] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [deliveries, setDeliveries] = useState([]);
  const [notificationsList, setNotificationsList] = useState([]);
  const [userName, setUserName] = useState("Admin");
  const [userRole, setUserRole] = useState("admin");
  const [loading, setLoading] = useState(true);
  const [myWeekHours, setMyWeekHours] = useState(0);
  const [myRecentHours, setMyRecentHours] = useState<
    { id: string; date: string; hours: number; notes?: string }[]
  >([]);

  const quickActions = [
    {
      id: "1",
      label: "New Order",
      href: "/dashboard/orders/new",
      icon: Package,
    },
    { id: "2", label: "Add Customer", href: "/dashboard/customers", icon: Box },
    {
      id: "3",
      label: "Inventory",
      href: "/dashboard/inventory",
      icon: ShoppingCart,
    },
    {
      id: "5",
      label: "Enter Hours",
      href: "/dashboard/hours",
      icon: Clock3,
    },
    ...(userRole === "staff"
      ? []
      : [
          {
            id: "4",
            label: "Settings",
            href: "/dashboard/settings",
            icon: DollarSign,
          },
        ]),
  ];

  const fetchDashboardData = useCallback(async (silent = false) => {
    try {
      if (!silent) {
        setLoading(true);
      }
      const [statsRes, inventoryRes, ordersRes, deliveriesRes, notificationsRes] =
        await Promise.all([
          api.get("/reports/dashboard"),
          api.get("/inventory"),
          api.get("/orders"),
          api.get("/deliveries"),
          api.get("/notifications"),
        ]);


      const stats = statsRes.data;

      // Calculate derived metrics from orders if not in stats
      const orders = ordersRes.data;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rentalOrdersCount = orders.filter(
        (o: any) => o.type === "rental",
      ).length;
      // Backend might not have 'type' on order yet, assuming extension or derived.
      // For now, let's just use what we have or mock logic if needed.
      // DTO didn't specify order type 'rental'.
      // Check create-order.dto.ts: no 'type'.
      // We'll set rentalOrders to 0 or use something else.

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const prePurchasesCount = orders.filter(
        (o: any) => o.isPrepaidRedemption,
      ).length;

      setMetrics({
        totalRevenue: stats.totalRevenue || 0,
        totalOrders: stats.totalOrders || 0,
        rentalOrders: rentalOrdersCount, // Placeholder logic
        prePurchases: prePurchasesCount,
      });

      // Inventory (take low stock items or just first few)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const items = inventoryRes.data.map((item: any) => ({
        id: item._id,
        product: item.name, // Component expects 'product'
        stockLeft: item.stockQuantity, // Component expects 'stockLeft'
        status:
          item.stockQuantity === 0
            ? "Out of Stock"
            : item.stockQuantity < 10
              ? "Low Stock"
              : "In Stock",
      }));
      setInventory(items.slice(0, 5));

      // Recent Transactions (Last 5 orders)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const recentTx = orders
        .sort(
          (a: any, b: any) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        )
        .slice(0, 5)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((order: any) => ({
          id: order._id,
          customer: order.customer
            ? `${order.customer.firstName} ${order.customer.lastName || ""}`
            : "Unknown",
          itemsPurchased: order.items?.length
            ? `${order.items.length} ${order.items.length === 1 ? "Item" : "Items"}`
            : "No Items",
          total: Number(order.grandTotal) || 0,
          status:
            order.paymentStatus === "paid"
              ? "Paid"
              : order.paymentStatus === "pending"
                ? "Pending"
                : "Unpaid",
          date: new Date(order.createdAt).toLocaleDateString(),
        }));
      setTransactions(recentTx);

      // Upcoming Deliveries (Next 5)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const upcomingDel = deliveriesRes.data
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .filter(
          (d: any) => d.status !== "delivered" && d.status !== "cancelled",
        )
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .sort(
          (a: any, b: any) =>
            new Date(a.scheduledDate).getTime() -
            new Date(b.scheduledDate).getTime(),
        )
        .slice(0, 5)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((d: any) => ({
          id: d._id,
          customer: d.customer
            ? `${d.customer.firstName} ${d.customer.lastName || ""}`
            : "Unknown",
          address: d.address?.street || "No address",
          dateTime: new Date(d.scheduledDate).toLocaleString(),
          status:
            d.status.charAt(0).toUpperCase() + d.status.slice(1).toLowerCase(),
        }));
      setDeliveries(upcomingDel);

      const notifications = (notificationsRes.data || []).map((n: any) => ({
        id: n._id,
        message: n.message,
        timestamp: timeAgo(n.createdAt || new Date()),
        icon: AlertTriangle,
      }));
      setNotificationsList(notifications);

      const userInfo = Cookies.get("user_info");
      if (userInfo) {
        try {
          const parsed = JSON.parse(userInfo);
          if (parsed.role === "staff" && parsed.id) {
            const start = new Date();
            const day = start.getDay();
            const diff = start.getDate() - day + (day === 0 ? -6 : 1);
            start.setDate(diff);
            start.setHours(0, 0, 0, 0);
            const end = new Date(start);
            end.setDate(start.getDate() + 6);
            end.setHours(23, 59, 59, 999);

            const [weekSummaryRes, recentHoursRes] = await Promise.all([
              api.get(
                `/employee-hours/summary?userId=${parsed.id}&from=${start.toISOString()}&to=${end.toISOString()}`,
              ),
              api.get(`/employee-hours?userId=${parsed.id}`),
            ]);

            const weekSummary = weekSummaryRes.data?.[0];
            setMyWeekHours(Number(weekSummary?.totalHours || 0));

            const recent = (recentHoursRes.data || []).slice(0, 4).map((entry: any) => ({
              id: entry._id,
              date: entry.workDate,
              hours: Number(entry.hours || 0),
              notes: entry.notes,
            }));
            setMyRecentHours(recent);
          }
        } catch (error) {
          console.error("Failed to load staff hours", error);
        }
      }
    } catch (error) {
      console.error("Failed to load dashboard data", error);
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();

    // Read user info from cookies
    const userInfo = Cookies.get("user_info");
    if (userInfo) {
      try {
        const parsed = JSON.parse(userInfo);
        if (parsed.name) setUserName(parsed.name);
        if (parsed.role) setUserRole(parsed.role);
      } catch (e) {
        console.error("Failed to parse user info", e);
      }
    }

    const interval = setInterval(fetchDashboardData, 60000);
    return () => clearInterval(interval);
  }, [fetchDashboardData]);

  useDashboardRealtime(() => {
    fetchDashboardData(true);
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
      </div>
    );
  }

  return (
    <div className="space-y-2 md:space-y-3 w-full overflow-x-hidden">
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
                myRecentHours.map((entry) => (
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
