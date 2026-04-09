"use client";

import { useState, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { SearchBar } from "@/features/orders/components/search-bar";
import { OrdersTable } from "@/features/orders/components/orders-table";
import { FiltersModal } from "@/features/orders/components/filters-modal";
import { DeleteOrderModal } from "@/features/orders/components/delete-order-modal";
import { EditOrderModal } from "@/features/orders/components/edit-order-modal";
import { OrderDetailsModal } from "@/features/orders/components/order-details-modal";
import { Order, OrderFilters } from "@/features/orders/types";
const orderStatuses = [
  "Pending",
  "Scheduled",
  "Completed",
  "Cancelled",
] as const;
const paymentStatuses = [
  "Paid",
  "Unpaid",
  "Partial",
  "Pending",
  "Out Stock",
] as const;
const deliveryTypes = ["Pickup", "Delivery"] as const;
import {
  Filter,
  Plus,
  Download,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Loader2,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Link from "next/link";
import api from "@/lib/api";
import { useDashboardRealtime } from "@/lib/use-dashboard-realtime";
import { useOrders, useSettings, queryKeys } from "@/lib/queries";
import { useQueryClient } from "@tanstack/react-query";

interface OrderApiCustomer {
  _id?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
}

interface OrderApiItem {
  item?: {
    _id?: string;
  };
  name?: string;
  sku?: string;
  quantity?: number;
  unitPrice?: number;
  totalPrice?: number;
  isPrepaidRedemption?: boolean;
  isRefill?: boolean;
}

interface OrderApiResponse {
  _id: string;
  orderNumber?: string;
  customer?: OrderApiCustomer;
  isWalkIn?: boolean;
  items?: OrderApiItem[];
  refills?: OrderApiItem[];
  grandTotal?: number;
  amountPaid?: number;
  isDelivery?: boolean;
  refillCount?: number;
  status?: string;
  paymentStatus?: string;
  deliveryAddress?: string;
  deliveryDate?: string;
  discount?: number;
  paymentMethod?: "cash" | "card" | "credit_redemption" | "store_credit";
  paymentDetails?: Order["paymentDetails"];
  emailReceipt?: boolean;
  createdAt?: string;
}

const capitalize = (value?: string) =>
  value ? value.charAt(0).toUpperCase() + value.slice(1) : "";

const mapApiOrderToOrder = (order: OrderApiResponse): Order => {
  const mappedItems = (order.items || []).map((item, index) => ({
    id: item.item?._id || `${order._id}-item-${index}`,
    itemId: item.item?._id,
    sku: item.sku,
    productName: item.name || "Unknown Product",
    quantity: item.quantity || 0,
    unitPrice: item.unitPrice || 0,
    totalPrice: item.totalPrice || 0,
    creditsUsed: !!item.isPrepaidRedemption,
    isRefill: !!item.isRefill,
  }));

  const mappedRefills = (order.refills || []).map((item, index) => ({
    id: item.item?._id || `${order._id}-refill-${index}`,
    itemId: item.item?._id,
    sku: item.sku,
    productName: item.name || "Unknown Refill",
    quantity: item.quantity || 0,
    unitPrice: item.unitPrice || 0,
    totalPrice: item.totalPrice || 0,
    creditsUsed: !!item.isPrepaidRedemption,
    isRefill: true,
  }));

  return {
    id: order._id,
    orderId: order.orderNumber || `ORD-${order._id.slice(-6).toUpperCase()}`,
    customer: order.customer
      ? `${order.customer.firstName || ""} ${order.customer.lastName || ""}`.trim() ||
        "Walk-in Customer"
      : "Walk-in Customer",
    customerEmail: order.customer?.email,
    customerPhone: order.customer?.phone,
    customerId_raw: order.customer?._id,
    items: mappedItems,
    refills: mappedRefills,
    totalPrice: order.grandTotal || 0,
    grandTotal: order.grandTotal || 0,
    amountPaid: order.amountPaid || 0,
    deliveryType: order.isDelivery ? "Delivery" : "Pickup",
    remainingCredits: order.refillCount || 0,
    orderStatus: (capitalize(order.status) || "Pending") as Order["orderStatus"],
    paymentStatus: (capitalize(order.paymentStatus) ||
      "Unpaid") as Order["paymentStatus"],
    deliveryAddress: order.deliveryAddress,
    scheduledDate: order.deliveryDate ? order.deliveryDate.split("T")[0] : "",
    createdAt: order.createdAt
      ? new Date(order.createdAt).toISOString().split("T")[0]
      : "",
    discount: order.discount,
    paymentMethod: order.paymentMethod,
    paymentDetails: order.paymentDetails,
    emailReceipt: order.emailReceipt,
  };
};

export default function OrdersPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<OrderFilters>({
    orderStatus: "All",
    paymentStatus: "All",
    deliveryType: "All",
  });
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isDetailsLoading, setIsDetailsLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const { data: rawOrders, isLoading: loading } = useOrders();
  const { data: settings } = useSettings();
  const taxRate: number = settings?.taxRate ?? 0;
  const qc = useQueryClient();
  const invalidate = useCallback(() => {
    void qc.invalidateQueries({ queryKey: queryKeys.orders() });
  }, [qc]);

  useDashboardRealtime(invalidate);

  const orders = useMemo((): Order[] => {
    const raw = (rawOrders as OrderApiResponse[] | undefined) ?? [];
    return [...raw]
      .sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime())
      .map((o) => {
        const mapped = mapApiOrderToOrder(o);
        const base = o.grandTotal || 0;
        mapped.grandTotal = base * (1 + taxRate);
        return mapped;
      });
  }, [rawOrders, taxRate]);

  // Filter and search orders
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const matchesSearch =
        order.orderId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.customer.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesOrderStatus =
        filters.orderStatus === "All" ||
        order.orderStatus === filters.orderStatus;
      const matchesPaymentStatus =
        filters.paymentStatus === "All" ||
        order.paymentStatus === filters.paymentStatus;
      const matchesDeliveryType =
        filters.deliveryType === "All" ||
        order.deliveryType === filters.deliveryType;
      return (
        matchesSearch &&
        matchesOrderStatus &&
        matchesPaymentStatus &&
        matchesDeliveryType
      );
    });
  }, [orders, searchQuery, filters]);

  // Pagination
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
  const paginatedOrders = filteredOrders.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  const handleEdit = (order: Order) => {
    setSelectedOrder(order);
    setIsEditModalOpen(true);
  };

  const handleUpdate = () => {
    invalidate();
    setSelectedOrder(null);
  };

  const handleStatusChange = async (
    orderId: string,
    status: Order["orderStatus"],
  ) => {
    try {
      await api.patch(`/orders/${orderId}/status`, {
        status: status.toLowerCase(),
      });
      invalidate();
    } catch (error) {
      console.error("Failed to update order status", error);
    }
  };

  const handleDelete = (order: Order) => {
    setSelectedOrder(order);
    setIsDeleteModalOpen(true);
  };

  const handleRowClick = async (order: Order) => {
    try {
      setSelectedOrder(order);
      setIsDetailsModalOpen(true);
      setIsDetailsLoading(true);
      const { data } = await api.get<OrderApiResponse>(`/orders/${order.id}`);
      setSelectedOrder(mapApiOrderToOrder(data));
    } catch (error) {
      console.error("Failed to fetch order details", error);
    } finally {
      setIsDetailsLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (selectedOrder) {
      // Delete API not implemented in backend controller explicitly?
      // Controller had Remove.
      try {
        // Wait, backend controller source:
        // @Delete(':id') remove(@Param('id') id: string) ...
        // It IS implemented.
        await api.delete(`/orders/${selectedOrder.id}`);
        invalidate();
        setSelectedOrder(null);
        setIsDeleteModalOpen(false);
      } catch (error) {
        console.error("Failed to delete order", error);
      }
    }
  };

  const handleExportCSV = () => {
    // TODO: Implement CSV export
    const csv = [
      [
        "Order ID",
        "Customer",
        "Items",
        "Grand Total",
        "Delivery Type",
        "Order Status",
        "Payment Status",
      ].join(","),
      ...filteredOrders.map((order) => {
        const totalItems = order.items.reduce(
          (sum, item) => sum + item.quantity,
          0,
        );
        return [
          order.orderId,
          order.customer,
          totalItems,
          (order.grandTotal ?? order.totalPrice ?? 0).toFixed(2),
          order.deliveryType,
          order.orderStatus,
          order.paymentStatus,
        ].join(",");
      }),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `orders-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-3 w-full overflow-x-hidden">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex items-center gap-3 flex-1">
          <h1 className="text-xl md:text-2xl font-semibold text-dark-900 dark:text-white">
            Orders Management
          </h1>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex-1 md:flex-initial min-w-[200px]">
            <SearchBar value={searchQuery} onChange={setSearchQuery} />
          </div>
          {/* <Button className="bg-primary-500 hover:bg-primary-600 text-white">
            <ShoppingCart className="h-4 w-4 mr-2" />
            Quickly Sell
          </Button> */}
          <Link href="/dashboard/orders/new">
            <Button
              variant="outline"
              className="border-primary-500 text-primary-500 hover:bg-primary-100 dark:hover:bg-primary-900/20 hover:text-primary-600 dark:hover:text-primary-400"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add New Order
            </Button>
          </Link>
          <Button
            variant="outline"
            onClick={handleExportCSV}
            className="border-primary-500 text-primary-500 hover:bg-primary-100 hover:text-primary-600"
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Orders List Section */}
      <div className="bg-white dark:bg-dark-700 rounded-xl border border-dark-200 dark:border-dark-600 shadow-sm dark:shadow-dark-900/50 p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-dark-900 dark:text-white">
            Orders List
          </h2>
          <Button
            variant="outline"
            onClick={() => setIsFiltersOpen(true)}
            className="border-primary-500 text-primary-500 hover:bg-primary-100 hover:text-primary-600"
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
          </div>
        ) : (
          <OrdersTable
            orders={paginatedOrders}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onStatusChange={handleStatusChange}
            statusOptions={orderStatuses}
            onRowClick={handleRowClick}
          />
        )}

        {/* Pagination */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4 pt-3 border-t border-dark-200 dark:border-dark-600">
          <div className="flex items-center gap-2">
            <Select
              value={itemsPerPage.toString()}
              onValueChange={(value) => {
                setItemsPerPage(Number(value));
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-20 h-9 border border-gray-300 rounded-md text-sm text-gray-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-sm text-gray-500">Records per page</span>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="h-8 w-8 text-gray-400 hover:text-gray-600 disabled:opacity-30"
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="h-8 w-8 text-gray-400 hover:text-gray-600 disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(3, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 3) {
                  pageNum = i + 1;
                } else if (currentPage === 1) {
                  pageNum = i + 1;
                } else if (currentPage === totalPages) {
                  pageNum = totalPages - 2 + i;
                } else {
                  pageNum = currentPage - 1 + i;
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`h-8 w-8 rounded-md text-sm font-medium transition-colors
              ${
                currentPage === pageNum
                  ? "bg-blue-100 text-blue-600 font-semibold"
                  : "text-gray-500 hover:bg-gray-100"
              }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={() =>
                setCurrentPage((prev) => Math.min(totalPages, prev + 1))
              }
              disabled={currentPage === totalPages}
              className="h-8 w-8 text-gray-400 hover:text-gray-600 disabled:opacity-30"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              className="h-8 w-8 text-gray-400 hover:text-gray-600 disabled:opacity-30"
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-end text-sm text-[#545454] dark:text-dark-500 py-4">
        Copyright {new Date().getFullYear()} Water Shop. All Rights Reserved
      </div>

      {/* Modals */}
      <FiltersModal
        open={isFiltersOpen}
        onOpenChange={setIsFiltersOpen}
        filters={filters}
        onFiltersChange={setFilters}
        orderStatuses={orderStatuses}
        paymentStatuses={paymentStatuses}
        deliveryTypes={deliveryTypes}
      />
      <EditOrderModal
        open={isEditModalOpen}
        onOpenChange={setIsEditModalOpen}
        order={selectedOrder}
        onUpdate={handleUpdate}
      />
      <DeleteOrderModal
        open={isDeleteModalOpen}
        onOpenChange={setIsDeleteModalOpen}
        order={selectedOrder}
        onConfirm={handleConfirmDelete}
      />
      <OrderDetailsModal
        open={isDetailsModalOpen}
        onOpenChange={setIsDetailsModalOpen}
        order={selectedOrder}
        loading={isDetailsLoading}
      />
    </div>
  );
}
