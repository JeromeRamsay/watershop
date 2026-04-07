"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { Order } from "../types";

interface OrderDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: Order | null;
  loading: boolean;
}

const formatCurrency = (value?: number) =>
  `$${Number(value || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const formatPaymentType = (value?: string) => {
  if (!value) return "-";
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};

export function OrderDetailsModal({
  open,
  onOpenChange,
  order,
  loading,
}: OrderDetailsModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Order Details</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary-500" />
          </div>
        ) : !order ? (
          <p className="text-sm text-dark-500">Order details not found.</p>
        ) : (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <p className="text-dark-500">Order ID</p>
                <p className="font-medium text-dark-900 dark:text-white">
                  {order.orderId}
                </p>
              </div>
              <div>
                <p className="text-dark-500">Customer</p>
                <p className="font-medium text-dark-900 dark:text-white">
                  {order.customer}
                </p>
              </div>
              <div>
                <p className="text-dark-500">Created Date</p>
                <p className="font-medium text-dark-900 dark:text-white">
                  {order.createdAt || "-"}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <p className="text-dark-500">Order Status</p>
                <p className="font-medium text-dark-900 dark:text-white">
                  {order.orderStatus}
                </p>
              </div>
              <div>
                <p className="text-dark-500">Payment Status</p>
                <p className="font-medium text-dark-900 dark:text-white">
                  {order.paymentStatus}
                </p>
              </div>
              <div>
                <p className="text-dark-500">Delivery Type</p>
                <p className="font-medium text-dark-900 dark:text-white">
                  {order.deliveryType}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <p className="text-dark-500">Subtotal</p>
                <p className="font-medium text-dark-900 dark:text-white">
                  {formatCurrency(
                    (order.items || []).reduce(
                      (sum, item) => sum + item.totalPrice,
                      0,
                    ) +
                      (order.refills || []).reduce(
                        (sum, item) => sum + item.totalPrice,
                        0,
                      ),
                  )}
                </p>
              </div>
              <div>
                <p className="text-dark-500">Grand Total</p>
                <p className="font-medium text-dark-900 dark:text-white">
                  {formatCurrency(order.grandTotal ?? order.totalPrice)}
                </p>
              </div>
              <div>
                <p className="text-dark-500">Amount Paid</p>
                <p className="font-medium text-dark-900 dark:text-white">
                  {formatCurrency(order.amountPaid)}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <p className="text-dark-500">Payment Method</p>
                <p className="font-medium text-dark-900 dark:text-white">
                  {order.paymentMethod || "-"}
                </p>
              </div>
              <div>
                <p className="text-dark-500">Delivery Address</p>
                <p className="font-medium text-dark-900 dark:text-white">
                  {order.deliveryAddress || "-"}
                </p>
              </div>
            </div>

            <div>
              <p className="text-dark-500 mb-2">Items</p>
              <div className="border rounded-lg overflow-x-auto">
                <table className="w-full min-w-[640px]">
                  <thead className="bg-dark-50 dark:bg-dark-600">
                    <tr>
                      <th className="text-left p-2 text-xs">Name</th>
                      <th className="text-left p-2 text-xs">SKU</th>
                      <th className="text-left p-2 text-xs">Qty</th>
                      <th className="text-left p-2 text-xs">Unit Price</th>
                      <th className="text-left p-2 text-xs">Total</th>
                      <th className="text-left p-2 text-xs">Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...(order.items || []), ...(order.refills || [])].map(
                      (item, index) => (
                        <tr key={`${item.id}-${index}`} className="border-t">
                          <td className="p-2 text-xs">{item.productName}</td>
                          <td className="p-2 text-xs">{item.sku || "-"}</td>
                          <td className="p-2 text-xs">{item.quantity}</td>
                          <td className="p-2 text-xs">
                            {formatCurrency(item.unitPrice)}
                          </td>
                          <td className="p-2 text-xs">
                            {formatCurrency(item.totalPrice)}
                          </td>
                          <td className="p-2 text-xs">
                            {item.isRefill ? "Refill" : "Item"}
                          </td>
                        </tr>
                      ),
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <p className="text-dark-500 mb-2">Payment Breakdown</p>
              <div className="rounded-md border bg-dark-50 dark:bg-dark-800 p-3 space-y-2">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <div>
                    <p className="text-dark-500 text-xs">Mode</p>
                    <p className="text-xs font-medium text-dark-900 dark:text-white">
                      {order.paymentDetails?.mode === "split"
                        ? "Split Payment"
                        : "Single Payment"}
                    </p>
                  </div>
                  <div>
                    <p className="text-dark-500 text-xs">Primary Method</p>
                    <p className="text-xs font-medium text-dark-900 dark:text-white">
                      {formatPaymentType(
                        order.paymentDetails?.paymentMethod || order.paymentMethod,
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-dark-500 text-xs">Total Paid</p>
                    <p className="text-xs font-medium text-dark-900 dark:text-white">
                      {formatCurrency(order.amountPaid)}
                    </p>
                  </div>
                </div>

                {order.paymentDetails?.mode === "single" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 border-t pt-2">
                    <div>
                      <p className="text-dark-500 text-xs">Payment Type</p>
                      <p className="text-xs font-medium text-dark-900 dark:text-white">
                        {formatPaymentType(order.paymentDetails.paymentMethod)}
                      </p>
                    </div>
                    <div>
                      <p className="text-dark-500 text-xs">Amount</p>
                      <p className="text-xs font-medium text-dark-900 dark:text-white">
                        {formatCurrency(order.paymentDetails.amount)}
                      </p>
                    </div>
                  </div>
                )}

                {order.paymentDetails?.mode === "split" && (
                  <div className="border-t pt-2">
                    <p className="text-dark-500 text-xs mb-2">Split Entries</p>
                    <div className="space-y-1">
                      {(order.paymentDetails.payments || []).map(
                        (payment, index) => (
                          <div
                            key={`${payment.type}-${index}`}
                            className="grid grid-cols-3 gap-2 rounded border bg-white dark:bg-dark-700 px-2 py-1 text-xs"
                          >
                            <span className="text-dark-500">{`Payment ${index + 1}`}</span>
                            <span className="font-medium text-dark-900 dark:text-white">
                              {formatPaymentType(payment.type)}
                            </span>
                            <span className="font-medium text-dark-900 dark:text-white text-right">
                              {formatCurrency(payment.amount)}
                            </span>
                          </div>
                        ),
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
