"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { Delivery } from "../types";

interface DeliveryDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  delivery: Delivery | null;
  loading: boolean;
}

const formatDateTime = (value?: string) => {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatCurrency = (value?: number) =>
  `$${Number(value || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export function DeliveryDetailsModal({
  open,
  onOpenChange,
  delivery,
  loading,
}: DeliveryDetailsModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Delivery Details</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary-500" />
          </div>
        ) : !delivery ? (
          <p className="text-sm text-dark-500">No delivery details found.</p>
        ) : (
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <p className="text-dark-500">Order Number</p>
                <p className="font-medium text-dark-900 dark:text-white">
                  {delivery.orderNumber || delivery.orderId || "-"}
                </p>
              </div>
              <div>
                <p className="text-dark-500">Status</p>
                <p className="font-medium text-dark-900 dark:text-white">
                  {delivery.status}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <p className="text-dark-500">Customer</p>
                <p className="font-medium text-dark-900 dark:text-white">
                  {delivery.customer}
                </p>
              </div>
              <div>
                <p className="text-dark-500">Phone</p>
                <p className="font-medium text-dark-900 dark:text-white">
                  {delivery.customerPhone || "-"}
                </p>
              </div>
            </div>

            <div>
              <p className="text-dark-500">Address</p>
              <p className="font-medium text-dark-900 dark:text-white">
                {delivery.address}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <p className="text-dark-500">Scheduled Date/Time</p>
                <p className="font-medium text-dark-900 dark:text-white">
                  {delivery.scheduledDate
                    ? formatDateTime(delivery.scheduledDate)
                    : delivery.dateTime}
                </p>
              </div>
              <div>
                <p className="text-dark-500">Time Slot</p>
                <p className="font-medium text-dark-900 dark:text-white">
                  {delivery.timeSlot || "-"}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <p className="text-dark-500">Order Payment Status</p>
                <p className="font-medium text-dark-900 dark:text-white">
                  {delivery.paymentStatus || "-"}
                </p>
              </div>
              <div>
                <p className="text-dark-500">Order Total</p>
                <p className="font-medium text-dark-900 dark:text-white">
                  {formatCurrency(delivery.grandTotal)}
                </p>
              </div>
            </div>

            <div>
              <p className="text-dark-500">Delivery Notes</p>
              <p className="font-medium text-dark-900 dark:text-white">
                {delivery.deliveryNotes || "-"}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <p className="text-dark-500">Created At</p>
                <p className="font-medium text-dark-900 dark:text-white">
                  {formatDateTime(delivery.createdAt)}
                </p>
              </div>
              <div>
                <p className="text-dark-500">Last Updated</p>
                <p className="font-medium text-dark-900 dark:text-white">
                  {formatDateTime(delivery.updatedAt)}
                </p>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
