"use client";

import { useCallback, useState } from "react";
import { WelcomeSection } from "@/features/dashboard/components/welcome-section";
import { MetricCard } from "@/features/dashboard/components/metric-card";
import { InventoryStatus } from "@/features/dashboard/components/inventory-status";
import { QuickActions } from "@/features/dashboard/components/quick-actions";
import { Notifications } from "@/features/dashboard/components/notifications";
import { RecentTransactions } from "@/features/dashboard/components/recent-transactions";
import { UpcomingDeliveries } from "@/features/dashboard/components/upcoming-deliveries";
import { EditOrderModal } from "@/features/orders/components/edit-order-modal";
import { CustomerDetailsModal } from "@/features/customers/components/customer-details-modal";
import { Notification } from "@/features/dashboard/types";
import { Order } from "@/features/orders/types";
import { Customer } from "@/features/customers/types";
import { DollarSign, Package, Box, ShoppingCart, Loader2, AlertTriangle, Clock3 } from "lucide-react";
import Cookies from "js-cookie";
import { useDashboardRealtime } from "@/lib/use-dashboard-realtime";
import {
  useDashboardStats, useInventory, useOrders, useDeliveries, useNotifications,
  useEmployeeHours, useClearNotification, useClearAllNotifications,
} from "@/lib/queries";
import { useQueryClient } from "@tanstack/react-query";
import { formatFullDate } from "@/lib/utils";
import api from "@/lib/api";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapApiOrder(o: any): Order {
  const cap = (v?: string) => (v ? v.charAt(0).toUpperCase() + v.slice(1) : "");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const items = (o.items || []).map((item: any, idx: number) => ({
    id: item.item?._id || (String(o._id) + "-item-" + idx),
    itemId: item.item?._id, sku: item.sku,
    productName: item.name || "Unknown Product",
    quantity: item.quantity || 0, unitPrice: item.unitPrice || 0,
    totalPrice: item.totalPrice || 0, creditsUsed: !!item.isPrepaidRedemption, isRefill: !!item.isRefill,
  }));
  const custName = o.customer ? (String(o.customer.firstName||"") + " " + String(o.customer.lastName||"")).trim() || "Walk-in" : "Walk-in Customer";
  return {
    id: String(o._id),
    orderId: o.orderNumber || ("ORD-" + String(o._id).slice(-6).toUpperCase()),
    customer: custName, customerEmail: o.customer?.email, customerPhone: o.customer?.phone, customerId_raw: o.customer?._id,
    items, refills: [],
    totalPrice: o.grandTotal||0, grandTotal: o.grandTotal||0, amountPaid: o.amountPaid||0,
    deliveryType: o.isDelivery ? "Delivery" : "Pickup", remainingCredits: o.refillCount||0,
    orderStatus: (cap(o.status)||"Pending") as Order["orderStatus"],
    paymentStatus: (cap(o.paymentStatus)||"Unpaid") as Order["paymentStatus"],
    deliveryAddress: o.deliveryAddress,
    scheduledDate: o.deliveryDate ? String(o.deliveryDate).split("T")[0] : "",
    createdAt: o.createdAt ? new Date(String(o.createdAt)).toISOString().split("T")[0] : "",
    discount: o.discount, paymentMethod: o.paymentMethod, paymentDetails: o.paymentDetails, emailReceipt: o.emailReceipt,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapApiCustomer(c: any): Customer {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const da = c.addresses?.find((a: any) => a.isDefault) || c.addresses?.[0];
  const street = da?.street || "";
  const cityPart = da?.city ? (", " + String(da.city)) : "";
  const addressStr = (street + cityPart).trim() || "No Address";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const creditsLeft = (c.wallet?.prepaidItems||[]).reduce((s: number, i: any) => s + (i.quantityRemaining||0), 0);
  return {
    id: String(c._id), name: (String(c.firstName||"") + " " + String(c.lastName||"")).trim(),
    email: c.email||"", phone: c.phone||"", address: addressStr,
    orders: Number(c.orders||0), creditsLeft, prepaidItems: c.wallet?.prepaidItems||[],
    familyGroup: c.familyMembers?.length > 0 ? (c.familyMembers.length + " Members") : null,
    customerType: c.type === "business" ? "Business" : "Individual", status: "Active",
    totalRefills: Number(c.totalRefills||0), orderHistory: [],
    billingAddress: street, deliveryAddress: street,
    country: da?.country||"", city: da?.city||"", state: da?.state||"", zipCode: da?.zipCode||"",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    familyMembers: (c.familyMembers||[]).map((m: any) => ({
      id: m._id||m.id, name: m.name||"", relationship: m.relationship||"", phone: m.phone||"", email: m.email,
    })),
  };
}

export default function DashboardPage() {
  const userInfo = (() => { try { return JSON.parse(Cookies.get("user_info") || "{}"); } catch { return {}; } })();
  const userName = userInfo?.name || "Admin";
  const userRole = userInfo?.role || "admin";
  const isStaff  = userRole === "staff";

  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isEditOrderOpen, setIsEditOrderOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);

  const { data: stats,          isLoading: l1 } = useDashboardStats();
  const { data: inventoryData,  isLoading: l2 } = useInventory();
  const { data: ordersData,     isLoading: l3 } = useOrders();
  const { data: deliveriesData, isLoading: l4 } = useDeliveries();
  const { data: notifData,      isLoading: l5 } = useNotifications();
  const { data: recentHoursData } = useEmployeeHours({});
  const loading = l1 || l2 || l3 || l4 || l5;
  const clearOne = useClearNotification();
  const clearAll = useClearAllNotifications();
  const qc = useQueryClient();
  useDashboardRealtime(useCallback(() => { void qc.invalidateQueries(); }, [qc]));

  // ── Today boundaries ────────────────────────────────────────────────────────
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const todayDateStr = todayStart.toISOString().split("T")[0]; // "YYYY-MM-DD"

  const orders = (ordersData as Record<string, unknown>[] | undefined) ?? [];
  // Filter to today's orders for the KPI cards
  const todayOrders = orders.filter((o) => {
    const d = new Date(String(o.createdAt ?? 0));
    return d >= todayStart;
  });
  const rentalOrdersCount = todayOrders.filter((o) => o.isDelivery === true).length;
  const prePurchasesCount = todayOrders.filter((o) => !!o.isPrepaidRedemption).length;
  const unpaidOrderIds = new Set<string>(
    orders.filter((o) => o.paymentStatus === "unpaid" || o.paymentStatus === "partial").map((o) => String(o._id)),
  );
  const metrics = {
    totalRevenue: (stats as { totalRevenue?: number } | undefined)?.totalRevenue ?? 0,
    totalOrders:  todayOrders.length,
    rentalOrders: rentalOrdersCount, prePurchases: prePurchasesCount,
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const inventory = ((inventoryData as any[]) ?? []).map((item: any) => {
    const qty = Number(item.stockQuantity);
    let status: "In Stock" | "Low Stock" | "Out of Stock" = "In Stock";
    if (qty === 0) status = "Out of Stock"; else if (qty < 10) status = "Low Stock";
    return { id: String(item._id), product: String(item.name), stockLeft: qty, status };
  }).slice(0, 5);

  const transactions = [...orders]
    .sort((a, b) => new Date(String(b.createdAt??0)).getTime() - new Date(String(a.createdAt??0)).getTime())
    .slice(0, 5)
    .map((order) => {
      const payStatus: "Paid" | "Pending" = order.paymentStatus === "paid" ? "Paid" : "Pending";
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cust = order.customer as any;
      const itemsArr = (order.items as unknown[]) ?? [];
      const ic = itemsArr.length;
      const itemLabel = ic > 0 ? (ic + " " + (ic === 1 ? "Item" : "Items")) : "No Items";
      return {
        id: String(order._id),
        customer: cust ? (String(cust.firstName??"") + " " + String(cust.lastName??"")).trim() : "Unknown",
        itemsPurchased: itemLabel, total: Number(order.grandTotal)||0, status: payStatus,
        date: new Date(String(order.createdAt)).toLocaleDateString(),
      };
    });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const deliveries = ((deliveriesData as any[]) ?? [])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .filter((d: any) => {
      if (d.status === "delivered" || d.status === "cancelled") return false;
      // Only show deliveries scheduled for today
      const scheduledDay = new Date(d.scheduledDate).toISOString().split("T")[0];
      return scheduledDay === todayDateStr;
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .sort((a: any, b: any) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime())
    .slice(0, 10)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((d: any) => ({
      id: String(d._id),
      customer: d.customer ? (String(d.customer.firstName??"") + " " + String(d.customer.lastName??"")).trim() : "Unknown",
      customerId: d.customer?._id ? String(d.customer._id) : "",
      address: d.address?.street || "No address",
      dateTime: new Date(d.scheduledDate).toLocaleString(),
      status: (String(d.status).charAt(0).toUpperCase() + String(d.status).slice(1).toLowerCase()) as "Confirmed" | "Pending" | "Scheduled",
    }));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const notificationsList: Notification[] = ((notifData as any[]) ?? []).map((n: any) => {
    const orderId = n.orderId ? String(n.orderId) : undefined;
    return { id: String(n._id), message: String(n.message), timestamp: formatFullDate(n.createdAt||new Date()), icon: AlertTriangle, orderId, hasBalance: !!orderId && unpaidOrderIds.has(orderId) };
  });

  const myRecentHours: { id: string; date: string; hours: number; notes?: string }[] =
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ((recentHoursData as any[]) ?? []).slice(0, 4).map((entry: any) => ({
      id: String(entry._id), date: String(entry.workDate), hours: Number(entry.hours||0), notes: entry.notes as string|undefined,
    }));

  const quickActions = [
    { id: "1", label: "New Order",    href: "/dashboard/orders/new", icon: Package },
    { id: "2", label: "Add Customer", href: "/dashboard/customers",  icon: Box },
    { id: "3", label: "Inventory",    href: "/dashboard/inventory",  icon: ShoppingCart },
    { id: "5", label: "Enter Hours",  href: "/dashboard/hours",      icon: Clock3 },
    ...(isStaff ? [] : [{ id: "4", label: "Settings", href: "/dashboard/settings", icon: DollarSign }]),
  ];

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.orderId) return;
    try {
      const { data } = await api.get("/orders/" + notification.orderId);
      setSelectedOrder(mapApiOrder(data));
      setIsEditOrderOpen(true);
    } catch (error) { console.error("Failed to fetch order for notification", error); }
  };

  const handleCustomerClick = async (customerId: string) => {
    if (!customerId) return;
    try {
      const { data } = await api.get("/customers/" + customerId);
      setSelectedCustomer(mapApiCustomer(data));
      setIsCustomerModalOpen(true);
    } catch (error) { console.error("Failed to fetch customer", error); }
  };

  const handleClearNotification = (id: string) => clearOne.mutate(id);
  const handleClearAll = () => clearAll.mutate();
  const handleOrderUpdate = () => { void qc.invalidateQueries(); setSelectedOrder(null); };

  if (loading) {
    return (<div className="flex items-center justify-center h-screen"><Loader2 className="h-8 w-8 animate-spin text-primary-500" /></div>);
  }

  return (
    <div className="space-y-2 md:space-y-3 w-full overflow-x-hidden">
      <WelcomeSection userName={userName} />
      <div className={`grid gap-2 sm:gap-3 grid-cols-2 md:grid-cols-2 ${userRole === "staff" ? "lg:grid-cols-3" : "lg:grid-cols-4"}`}>
        {userRole === "staff" ? null : (
          <MetricCard title="Total Sales" value={"$" + metrics.totalRevenue.toFixed(2)} icon={DollarSign} iconColor="text-primary-600" iconBg="bg-primary-100" />
        )}
        <MetricCard title="Orders Processed" value={metrics.totalOrders.toString()} icon={Package} iconColor="text-green-600" iconBg="bg-green-100" />
        <MetricCard title="Rental Orders"     value={metrics.rentalOrders.toString()} icon={Box}     iconColor="text-red-600"   iconBg="bg-red-100"   />
        <MetricCard title="Pre-Purchases"     value={metrics.prePurchases.toString()} icon={ShoppingCart} iconColor="text-orange-600" iconBg="bg-orange-100" />
      </div>
      <div className="grid gap-3 grid-cols-1 md:grid-cols-12 items-stretch">
        <div className="md:col-span-5 flex"><InventoryStatus items={inventory} /></div>
        <div className="md:col-span-3 flex"><QuickActions actions={quickActions} /></div>
        <div className="md:col-span-4 flex">
          <Notifications notifications={notificationsList} onClear={handleClearNotification} onClearAll={handleClearAll} onNotificationClick={handleNotificationClick} />
        </div>
      </div>
      {/* Bottom row — Upcoming Deliveries aligns under InventoryStatus(5)+QuickActions(3) = col-span-8 */}
      <div className="grid gap-3 grid-cols-1 md:grid-cols-12">
        <div className="md:col-span-8">
          <UpcomingDeliveries deliveries={deliveries} onCustomerClick={handleCustomerClick} />
        </div>
        {userRole !== "staff" && (
          <div className="md:col-span-4 flex flex-col gap-3">
            <RecentTransactions transactions={transactions} />
            <div className="bg-white dark:bg-dark-700 rounded-xl border border-dark-200 dark:border-dark-600 shadow-sm p-4">
              <h3 className="text-sm font-semibold text-dark-900 dark:text-white mb-2">Recent Logged Hours</h3>
              <div className="space-y-2">
                {myRecentHours.length > 0 ? (
                  myRecentHours.map((entry) => (
                    <div key={entry.id} className="flex justify-between text-xs border-b border-dark-200 dark:border-dark-600 pb-1">
                      <span>{formatFullDate(entry.date)}</span>
                      <span className="font-semibold">{entry.hours.toFixed(2)}h</span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-dark-500">No hour entries yet.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
      <div className="text-end text-xs text-dark-500 py-2">Copyright {new Date().getFullYear()} Water Shop. All Rights Reserved</div>
      <EditOrderModal open={isEditOrderOpen} onOpenChange={setIsEditOrderOpen} order={selectedOrder} onUpdate={handleOrderUpdate} />
      <CustomerDetailsModal open={isCustomerModalOpen} onOpenChange={setIsCustomerModalOpen} customer={selectedCustomer} />
    </div>
  );
}