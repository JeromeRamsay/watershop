"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { SearchBar } from "@/features/deliveries/components/search-bar";
import { DeliveriesTable } from "@/features/deliveries/components/deliveries-table";
import { DeliveriesCalendar } from "@/features/deliveries/components/deliveries-calendar";
import { FiltersModal } from "@/features/deliveries/components/filters-modal";
import { DeleteDeliveryModal } from "@/features/deliveries/components/delete-delivery-modal";
import { EditDeliveryModal } from "@/features/deliveries/components/edit-delivery-modal";
import { ScheduleDeliveryModal } from "@/features/deliveries/components/schedule-delivery-modal";
import { DeliveryDetailsModal } from "@/features/deliveries/components/delivery-details-modal";
import { Delivery, DeliveryFilters } from "@/features/deliveries/types";

const deliveryStatuses = [
  "Scheduled",
  "Out for delivery",
  "Delivered",
  "Failed",
  "Cancelled",
] as const;
const deliveryTypes = ["Pickup", "Delivery"] as const;
import { Order } from "@/features/orders/types";
import {
  Filter,
  Plus,
  Download,
  ShoppingCart,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Calendar,
  List,
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

interface DeliveryApiAddress {
  street?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
}

interface DeliveryApiOrder {
  _id?: string;
  orderNumber?: string;
  grandTotal?: number;
  paymentStatus?: string;
}

interface DeliveryApiCustomer {
  _id?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
}

interface DeliveryApiResponse {
  _id: string;
  order?: DeliveryApiOrder | string;
  orderId?: DeliveryApiOrder | string;
  customer?: DeliveryApiCustomer;
  address?: DeliveryApiAddress;
  scheduledDate?: string;
  timeSlot?: string;
  status?: string;
  deliveryNotes?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface DeliveryPageOrderApiResponse {
  _id: string;
  customer?: {
    _id?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
  };
  grandTotal?: number;
  isDelivery?: boolean;
  status?: string;
  paymentStatus?: string;
  deliveryAddress?: string;
  deliveryDate?: string;
  createdAt?: string;
}

const toTitleCase = (value?: string) =>
  value
    ? value
        .split("_")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ")
    : "";

const mapApiDelivery = (delivery: DeliveryApiResponse): Delivery => {
  const linkedOrder =
    typeof delivery.order === "object"
      ? delivery.order
      : typeof delivery.orderId === "object"
        ? delivery.orderId
        : undefined;

  const linkedOrderId =
    (typeof delivery.order === "object"
      ? delivery.order?._id
      : delivery.order) ||
    (typeof delivery.orderId === "object"
      ? delivery.orderId?._id
      : delivery.orderId);

  return {
    id: delivery._id,
    orderId: linkedOrderId || undefined,
    orderNumber: linkedOrder?.orderNumber,
    customer:
      `${delivery.customer?.firstName || ""} ${delivery.customer?.lastName || ""}`.trim() ||
      "Unknown Customer",
    customerEmail: delivery.customer?.email,
    customerPhone: delivery.customer?.phone,
    address: [
      delivery.address?.street,
      delivery.address?.city,
      delivery.address?.state,
      delivery.address?.zipCode,
    ]
      .filter(Boolean)
      .join(", "),
    dateTime:
      `${delivery.scheduledDate?.split("T")[0] || ""} ${delivery.timeSlot || ""}`.trim(),
    status: (toTitleCase(delivery.status) || "Scheduled") as Delivery["status"],
    scheduledDate: delivery.scheduledDate,
    timeSlot: delivery.timeSlot,
    deliveryNotes: delivery.deliveryNotes,
    createdAt: delivery.createdAt,
    updatedAt: delivery.updatedAt,
    paymentStatus: linkedOrder?.paymentStatus
      ? toTitleCase(linkedOrder.paymentStatus)
      : undefined,
    grandTotal: linkedOrder?.grandTotal,
  };
};

export default function DeliveriesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<DeliveryFilters>({
    orderStatus: "All",
    deliveryType: "All",
  });
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isDetailsLoading, setIsDetailsLoading] = useState(false);
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(
    null,
  );
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [calendarView, setCalendarView] = useState<"month" | "week" | "day">(
    "month",
  );

  const fetchData = useCallback(async (silent = false) => {
    try {
      if (!silent) {
        setLoading(true);
      }
      const [deliveriesRes, ordersRes] = await Promise.all([
        api.get<DeliveryApiResponse[]>("/deliveries"),
        api.get<DeliveryPageOrderApiResponse[]>("/orders"),
      ]);
      const sortedDeliveries = [
        ...((deliveriesRes.data || []) as DeliveryApiResponse[]),
      ].sort(
        (a, b) =>
          new Date(
            b.createdAt || b.scheduledDate || b.updatedAt || 0,
          ).getTime() -
          new Date(
            a.createdAt || a.scheduledDate || a.updatedAt || 0,
          ).getTime(),
      );

      const mappedDeliveries: Delivery[] = sortedDeliveries.map(mapApiDelivery);
      setDeliveries(mappedDeliveries);

      const mappedOrders: Order[] = [...(ordersRes.data || [])]
        .sort(
          (a, b) =>
            new Date(b.createdAt || 0).getTime() -
            new Date(a.createdAt || 0).getTime(),
        )
        .map((order) => {
          const deliveryIso = order.deliveryDate;
          const deliveryDateOnly = deliveryIso
            ? new Date(deliveryIso).toISOString().split("T")[0]
            : "";
          const deliveryTimeOnly = deliveryIso
            ? new Date(deliveryIso).toISOString().split("T")[1]?.slice(0, 5)
            : "";
          return {
            id: order._id,
            orderId: `ORD-${order._id.slice(-6).toUpperCase()}`,
            customerId_raw:
              typeof order.customer === "object"
                ? order.customer?._id
                : order.customer,
            customer: `${order.customer?.firstName} ${order.customer?.lastName}`,
            customerEmail: order.customer?.email,
            customerPhone: order.customer?.phone,
            items: [],
            totalPrice: order.grandTotal ?? 0,
            deliveryType: order.isDelivery ? "Delivery" : "Pickup",
            remainingCredits: 0,
            orderStatus: (order.status || "Pending") as Order["orderStatus"],
            paymentStatus: (order.paymentStatus ||
              "Unpaid") as Order["paymentStatus"],
            deliveryAddress: order.deliveryAddress || "",
            scheduledDate: deliveryDateOnly,
            scheduledTime: deliveryTimeOnly,
            createdAt: order.createdAt || "",
          };
        });
      setOrders(mappedOrders);
    } catch (error) {
      console.error("Failed to fetch deliveries data", error);
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useDashboardRealtime(() => {
    fetchData(true);
  });

  const filteredDeliveries = useMemo(() => {
    return deliveries.filter((delivery) => {
      const matchesSearch =
        delivery.customer.toLowerCase().includes(searchQuery.toLowerCase()) ||
        delivery.address.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesOrderStatus =
        filters.orderStatus === "All" ||
        delivery.status === filters.orderStatus;
      const matchesDeliveryType = filters.deliveryType === "All" || true;
      return matchesSearch && matchesOrderStatus && matchesDeliveryType;
    });
  }, [deliveries, searchQuery, filters]);

  const totalPages = Math.ceil(filteredDeliveries.length / itemsPerPage);
  const paginatedDeliveries = filteredDeliveries.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  const handleEdit = (delivery: Delivery) => {
    setSelectedDelivery(delivery);
    setIsEditModalOpen(true);
  };

  const handleUpdate = async (data: Delivery) => {
    try {
      const payload = {
        status: data.status.toLowerCase(),
        scheduledDate: new Date(data.dateTime.split(" ")[0]).toISOString(),
        timeSlot: data.dateTime.split(" ")[1] || "",
      };
      await api.patch(`/deliveries/${data.id}`, payload);
      fetchData();
    } catch (err) {
      console.error("Failed to update delivery", err);
    }
    setSelectedDelivery(null);
  };

  const handleStatusChange = async (
    deliveryId: string,
    status: Delivery["status"],
  ) => {
    try {
      await api.patch(`/deliveries/${deliveryId}`, {
        status: status.toLowerCase().replace(/\s+/g, "_"),
      });
      fetchData();
    } catch (err) {
      console.error("Failed to update delivery status", err);
    }
  };

  const handleDelete = (delivery: Delivery) => {
    setSelectedDelivery(delivery);
    setIsDeleteModalOpen(true);
  };

  const handleRowClick = async (delivery: Delivery) => {
    try {
      setSelectedDelivery(delivery);
      setIsDetailsModalOpen(true);
      setIsDetailsLoading(true);
      const { data } = await api.get<DeliveryApiResponse>(
        `/deliveries/${delivery.id}`,
      );
      setSelectedDelivery(mapApiDelivery(data));
    } catch (error) {
      console.error("Failed to fetch delivery details", error);
    } finally {
      setIsDetailsLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (selectedDelivery) {
      try {
        await api.delete(`/deliveries/${selectedDelivery.id}`);
        fetchData();
      } catch (err) {
        console.error("Failed to delete delivery", err);
      }
      setSelectedDelivery(null);
    }
  };

  const handleSchedule = async (
    deliveryData: Omit<Delivery, "id"> & { id?: string },
  ) => {
    try {
      const addressParts = deliveryData.address.split(",").map((s) => s.trim());
      const addressDto = {
        street: addressParts[0] || deliveryData.address,
        city: addressParts[1] || "Unknown",
        state: addressParts[2] || "",
        zipCode: addressParts[3] || "",
        country: "USA",
      };
      const payload = {
        orderId: deliveryData.orderId,
        address: addressDto,
        scheduledDate: new Date(
          deliveryData.dateTime.split(" ")[0],
        ).toISOString(),
        timeSlot: deliveryData.dateTime.split(" ")[1] || "",
        status: deliveryData.status.toLowerCase().replace(/\s+/g, "_"),
        deliveryNotes: "",
      };
      const linkedOrder = orders.find((o) => o.id === deliveryData.orderId);
      if (deliveryData.id) {
        await api.patch(`/deliveries/${deliveryData.id}`, {
          ...payload,
          customerId: linkedOrder?.customerId_raw,
        });
      } else {
        await api.post("/deliveries", {
          ...payload,
          customerId: linkedOrder?.customerId_raw,
        });
      }
      fetchData();
      setIsScheduleModalOpen(false);
    } catch (err) {
      console.error("Failed to schedule delivery", err);
    }
  };

  const handleExportCSV = () => {
    const csv = [
      ["Customer", "Address", "Date & Time", "Status"].join(","),
      ...filteredDeliveries.map((delivery) =>
        [
          delivery.customer,
          delivery.address,
          delivery.dateTime,
          delivery.status,
        ].join(","),
      ),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `deliveries-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-3 w-full overflow-x-hidden">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex items-center gap-3 flex-1">
          <h1 className="text-xl md:text-2xl font-semibold text-dark-900 dark:text-white">
            Deliveries Management
          </h1>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex-1 md:flex-initial min-w-[200px]">
            <SearchBar value={searchQuery} onChange={setSearchQuery} />
          </div>
          <Link href="/dashboard/orders/new?type=delivery">
            <Button className="bg-primary-500 hover:bg-primary-600 text-white">
              <ShoppingCart className="h-4 w-4 mr-2" />
              Quickly Sell
            </Button>
          </Link>
          <Button
            variant="outline"
            onClick={() => setIsScheduleModalOpen(true)}
            className="border-primary-500 text-primary-500 hover:bg-primary-100 dark:hover:bg-primary-900/20 hover:text-primary-600 dark:hover:text-primary-400"
          >
            <Plus className="h-4 w-4 mr-2" />
            Schedule Delivery
          </Button>
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

      {/* Deliveries Section */}
      <div className="bg-white dark:bg-dark-700 rounded-xl border border-dark-200 dark:border-dark-600 shadow-sm dark:shadow-dark-900/50 p-4">
        {/* Card header — NO Month/Week/Day toggle here; it lives inside DeliveriesCalendar */}
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-dark-900 dark:text-white">
            {viewMode === "list" ? "Deliveries List" : "Deliveries Schedule"}
          </h2>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setIsFiltersOpen(true)}
              className="border-primary-500 text-primary-500 hover:bg-primary-100 hover:text-primary-600"
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </Button>
            {/* Calendar / List view toggle */}
            <div className="flex items-center gap-1 border border-dark-200 rounded-lg p-1">
              <Button
                variant={viewMode === "calendar" ? "default" : "ghost"}
                size="icon"
                onClick={() => setViewMode("calendar")}
                className={`h-8 w-8 ${viewMode === "calendar" ? "bg-primary-500 text-white" : ""}`}
              >
                <Calendar className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "ghost"}
                size="icon"
                onClick={() => setViewMode("list")}
                className={`h-8 w-8 ${viewMode === "list" ? "bg-primary-500 text-white" : ""}`}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
          </div>
        ) : (
          <>
            {viewMode === "list" && (
              <>
                <DeliveriesTable
                  deliveries={paginatedDeliveries}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onStatusChange={handleStatusChange}
                  statusOptions={deliveryStatuses}
                  onRowClick={handleRowClick}
                />

                {/* Pagination */}
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-dark-200 dark:border-dark-600">
                  <div className="flex items-center gap-3">
                    <Select
                      value={itemsPerPage.toString()}
                      onValueChange={(value) => {
                        setItemsPerPage(Number(value));
                        setCurrentPage(1);
                      }}
                    >
                      <SelectTrigger className="w-[72px] h-8 rounded-md border border-[#E2E8F0] bg-white text-[13px] shadow-none focus:ring-0">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="20">20</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                        <SelectItem value="100">100</SelectItem>
                      </SelectContent>
                    </Select>
                    <span className="text-[13px] weight-[400] text-[#545454]">
                      Records per page
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                      className="h-7 w-7 grid place-items-center text-[#CBD5E1] hover:text-[#94A3B8] disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <ChevronsLeft className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() =>
                        setCurrentPage((prev) => Math.max(1, prev - 1))
                      }
                      disabled={currentPage === 1}
                      className="h-7 w-7 grid place-items-center text-[#CBD5E1] hover:text-[#94A3B8] disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </button>
                    <div className="flex items-center gap-1 mx-1">
                      {Array.from(
                        { length: Math.min(3, totalPages) },
                        (_, i) => {
                          let pageNum;
                          if (totalPages <= 3) pageNum = i + 1;
                          else if (currentPage === 1) pageNum = i + 1;
                          else if (currentPage === totalPages)
                            pageNum = totalPages - 2 + i;
                          else pageNum = currentPage - 1 + i;
                          const isActive = currentPage === pageNum;
                          return (
                            <button
                              key={pageNum}
                              onClick={() => setCurrentPage(pageNum)}
                              className={`h-7 w-7 rounded-md text-xs font-medium transition-colors ${
                                isActive
                                  ? "bg-[#DBEAFE] text-[#3B82F6]"
                                  : "text-[#6B7280] hover:bg-[#F3F4F6]"
                              }`}
                            >
                              {pageNum}
                            </button>
                          );
                        },
                      )}
                    </div>
                    <button
                      onClick={() =>
                        setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                      }
                      disabled={currentPage === totalPages}
                      className="h-7 w-7 grid place-items-center text-[#CBD5E1] hover:text-[#94A3B8] disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={currentPage === totalPages}
                      className="h-7 w-7 grid place-items-center text-[#CBD5E1] hover:text-[#94A3B8] disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <ChevronsRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </>
            )}

            {viewMode === "calendar" && (
              <DeliveriesCalendar
                deliveries={filteredDeliveries}
                view={calendarView}
                onViewChange={setCalendarView}
              />
            )}
          </>
        )}
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
        orderStatuses={deliveryStatuses}
        deliveryTypes={deliveryTypes}
      />
      <EditDeliveryModal
        open={isEditModalOpen}
        onOpenChange={setIsEditModalOpen}
        delivery={selectedDelivery}
        onUpdate={handleUpdate}
      />
      <DeleteDeliveryModal
        open={isDeleteModalOpen}
        onOpenChange={setIsDeleteModalOpen}
        delivery={selectedDelivery}
        onConfirm={handleConfirmDelete}
      />
      <ScheduleDeliveryModal
        open={isScheduleModalOpen}
        onOpenChange={setIsScheduleModalOpen}
        orders={orders}
        existingDeliveries={deliveries}
        onSchedule={handleSchedule}
      />
      <DeliveryDetailsModal
        open={isDetailsModalOpen}
        onOpenChange={setIsDetailsModalOpen}
        delivery={selectedDelivery}
        loading={isDetailsLoading}
      />
    </div>
  );
}
