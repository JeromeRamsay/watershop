"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Order } from "@/features/orders/types";
import { Delivery } from "../types";
import { useState, useMemo } from "react";
import { Search } from "lucide-react";

interface ScheduleDeliveryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orders: Order[];
  existingDeliveries: Delivery[];
  onSchedule: (delivery: Omit<Delivery, "id"> & { id?: string }) => void;
}

export function ScheduleDeliveryModal({
  open,
  onOpenChange,
  orders,
  existingDeliveries,
  onSchedule,
}: ScheduleDeliveryModalProps) {
  const [selectedOrderId, setSelectedOrderId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [deliveryTime, setDeliveryTime] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryStatus, setDeliveryStatus] =
    useState<Delivery["status"]>("Scheduled");

  // Filter orders to only show those with delivery type
  const deliveryOrders = useMemo(() => {
    return orders.filter((order) => order.deliveryType === "Delivery");
  }, [orders]);

  // Filter orders by search query
  const filteredOrders = useMemo(() => {
    if (!searchQuery) return deliveryOrders;
    const query = searchQuery.toLowerCase();
    return deliveryOrders.filter(
      (order) =>
        order.orderId.toLowerCase().includes(query) ||
        order.customer.toLowerCase().includes(query) ||
        order.deliveryAddress?.toLowerCase().includes(query),
    );
  }, [deliveryOrders, searchQuery]);

  // Get selected order
  const selectedOrder = useMemo(() => {
    return deliveryOrders.find((order) => order.id === selectedOrderId);
  }, [deliveryOrders, selectedOrderId]);

  // Check if delivery already exists for this order
  const existingDelivery = useMemo(() => {
    if (!selectedOrder) return null;
    return existingDeliveries.find(
      (delivery) => delivery.orderId === selectedOrder.id,
    );
  }, [selectedOrder, existingDeliveries]);

  // Update form when order is selected
  const handleOrderSelect = (orderId: string) => {
    setSelectedOrderId(orderId);
    const order = deliveryOrders.find((o) => o.id === orderId);
    if (order) {
      setDeliveryAddress(order.deliveryAddress || "");

      // Check if delivery already exists
      const existing = existingDeliveries.find((d) => d.orderId === order.id);
      if (existing) {
        // Parse existing date/time (format: "MM/DD/YY HH:mm")
        const [datePart, timePart] = existing.dateTime.split(" ");
        setDeliveryDate(datePart || "");
        setDeliveryTime(timePart || "");
        setDeliveryStatus(existing.status);
      } else {
        // Use order's scheduled date/time if available
        setDeliveryDate(order.scheduledDate || "");
        setDeliveryTime(order.scheduledTime || "");
        setDeliveryStatus("Scheduled");
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;

    const dateTime =
      deliveryDate && deliveryTime
        ? `${deliveryDate} ${deliveryTime}`
        : deliveryDate || "";

    const delivery: Omit<Delivery, "id"> & { id?: string } = {
      customer: selectedOrder.customer,
      address: deliveryAddress || selectedOrder.deliveryAddress || "",
      dateTime:
        dateTime ||
        new Date().toLocaleDateString("en-US", {
          month: "2-digit",
          day: "2-digit",
          year: "2-digit",
        }),
      status: deliveryStatus,
      orderId: selectedOrder.id, // Pass Mongo ID
      customerEmail: selectedOrder.customerEmail,
      customerPhone: selectedOrder.customerPhone,
      id: existingDelivery?.id, // Pass existing delivery ID for updates
    };

    onSchedule(delivery);

    // Reset form
    setSelectedOrderId("");
    setDeliveryDate("");
    setDeliveryTime("");
    setDeliveryAddress("");
    setDeliveryStatus("Scheduled");
    setSearchQuery("");
    onOpenChange(false);
  };

  const handleCancel = () => {
    setSelectedOrderId("");
    setDeliveryDate("");
    setDeliveryTime("");
    setDeliveryAddress("");
    setDeliveryStatus("Scheduled");
    setSearchQuery("");
    onOpenChange(false);
  };

  // Format date for input (convert from MM/DD/YY to YYYY-MM-DD)
  const formatDateForInput = (dateStr: string): string => {
    if (!dateStr) return "";
    try {
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        return dateStr;
      }
      const parts = dateStr.split("/");
      if (parts.length !== 3) return "";
      const [month, day, year] = parts;
      const fullYear =
        year && year.length === 2
          ? parseInt(year) < 50
            ? `20${year}`
            : `19${year}`
          : year;
      return `${fullYear}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    } catch {
      return "";
    }
  };

  // Format date from input (convert from YYYY-MM-DD to MM/DD/YY)
  const formatDateFromInput = (dateStr: string): string => {
    if (!dateStr) return "";
    try {
      return dateStr;
    } catch {
      return "";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {existingDelivery ? "Reschedule Delivery" : "Schedule Delivery"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {/* Search Orders */}
            <div className="space-y-2">
              <Label htmlFor="searchOrder">Search Order</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-dark-400" />
                <Input
                  id="searchOrder"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by Order ID, Customer, or Address"
                  className="pl-10 h-12"
                />
              </div>
            </div>

            {/* Select Order */}
            <div className="space-y-2">
              <Label htmlFor="order">Select Order</Label>
              <Select value={selectedOrderId} onValueChange={handleOrderSelect}>
                <SelectTrigger className="h-12" id="order">
                  <SelectValue placeholder="Select an order with delivery type" />
                </SelectTrigger>
                <SelectContent>
                  {filteredOrders.length === 0 ? (
                    <SelectItem value="no-orders" disabled>
                      No orders found
                    </SelectItem>
                  ) : (
                    filteredOrders.map((order) => (
                      <SelectItem key={order.id} value={order.id}>
                        {order.orderId} - {order.customer}{" "}
                        {order.deliveryAddress
                          ? `(${order.deliveryAddress.substring(0, 30)}...)`
                          : ""}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {selectedOrder && (
              <>
                {/* Order Info */}
                <div className="bg-dark-50 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-dark-600">
                      Order ID:
                    </span>
                    <span className="text-sm text-dark-900">
                      {selectedOrder.orderId}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-dark-600">
                      Customer:
                    </span>
                    <span className="text-sm text-dark-900">
                      {selectedOrder.customer}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-dark-600">
                      Total:
                    </span>
                    <span className="text-sm text-dark-900">
                      ${selectedOrder.totalPrice?.toFixed(2)}
                    </span>
                  </div>
                  {existingDelivery && (
                    <div className="mt-2 pt-2 border-t border-dark-200">
                      <p className="text-xs text-dark-500">
                        Delivery already exists for this order. You can
                        reschedule it below.
                      </p>
                    </div>
                  )}
                </div>

                {/* Delivery Address */}
                <div className="space-y-2">
                  <Label htmlFor="deliveryAddress">Delivery Address</Label>
                  <Input
                    id="deliveryAddress"
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    placeholder="Enter delivery address"
                    className="h-12"
                    required
                  />
                </div>

                {/* Delivery Date */}
                <div className="space-y-2">
                  <Label htmlFor="deliveryDate">Delivery Date</Label>
                  <Input
                    id="deliveryDate"
                    type="date"
                    value={deliveryDate ? formatDateForInput(deliveryDate) : ""}
                    onChange={(e) => {
                      const formatted = formatDateFromInput(e.target.value);
                      setDeliveryDate(formatted);
                    }}
                    className="h-12"
                    required
                  />
                </div>

                {/* Delivery Time */}
                <div className="space-y-2">
                  <Label htmlFor="deliveryTime">Delivery Time</Label>
                  <Input
                    id="deliveryTime"
                    type="time"
                    value={deliveryTime}
                    onChange={(e) => setDeliveryTime(e.target.value)}
                    className="h-12"
                    required
                  />
                </div>

                {/* Delivery Status */}
                <div className="space-y-2">
                  <Label htmlFor="deliveryStatus">Status</Label>
                  <Select
                    value={deliveryStatus}
                    onValueChange={(value) =>
                      setDeliveryStatus(value as Delivery["status"])
                    }
                  >
                    <SelectTrigger className="h-12" id="deliveryStatus">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Scheduled">Scheduled</SelectItem>
                      <SelectItem value="Out for delivery">Out for delivery</SelectItem>
                      <SelectItem value="Delivered">Delivered</SelectItem>
                      <SelectItem value="Failed">Failed</SelectItem>
                      <SelectItem value="Cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              className="border-primary-500 text-primary-500 hover:bg-primary-100 hover:text-primary-600"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!selectedOrder}>
              {existingDelivery ? "Update Schedule" : "Schedule Delivery"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
