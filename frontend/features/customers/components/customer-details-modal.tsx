"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Customer } from "../types";

interface CustomerDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: Customer | null;
}

const formatDate = (value?: string) => {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const formatLabel = (value?: string) => {
  if (!value) return "-";
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};

const getOrderType = (itemsCount: number, refillCount: number) => {
  if (itemsCount > 0 && refillCount > 0) return "Item + Refill";
  if (refillCount > 0) return "Refill";
  if (itemsCount > 0) return "Item";
  return "-";
};

export function CustomerDetailsModal({
  open,
  onOpenChange,
  customer,
}: CustomerDetailsModalProps) {
  if (!customer) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-dark-900 dark:text-white">
            Customer Details
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-dark-500 dark:text-dark-400">Name</p>
            <p className="font-medium text-dark-900 dark:text-white">
              {customer.name}
            </p>
          </div>
          <div>
            <p className="text-dark-500 dark:text-dark-400">Phone</p>
            <p className="font-medium text-dark-900 dark:text-white">
              {customer.phone}
            </p>
          </div>
          <div>
            <p className="text-dark-500 dark:text-dark-400">Email</p>
            <p className="font-medium text-dark-900 dark:text-white">
              {customer.email}
            </p>
          </div>
          <div>
            <p className="text-dark-500 dark:text-dark-400">Address</p>
            <p className="font-medium text-dark-900 dark:text-white">
              {customer.address}
            </p>
          </div>
          <div>
            <p className="text-dark-500 dark:text-dark-400">Total Orders</p>
            <p className="font-medium text-dark-900 dark:text-white">
              {customer.orders}
            </p>
          </div>
          <div>
            <p className="text-dark-500 dark:text-dark-400">Total Refills</p>
            <p className="font-medium text-dark-900 dark:text-white">
              {customer.totalRefills || 0}
            </p>
          </div>
          <div>
            <p className="text-dark-500 dark:text-dark-400">
              Remaining Refills
            </p>
            <p className="font-medium text-dark-900 dark:text-white">
              {customer.creditsLeft} Refills
            </p>
          </div>
          <div>
            <p className="text-dark-500 dark:text-dark-400">Family Group</p>
            <p className="font-medium text-dark-900 dark:text-white">
              {customer.familyGroup || "-"}
            </p>
          </div>
        </div>

        <div className="pt-2">
          <h3 className="text-sm font-semibold text-dark-900 dark:text-white mb-2">
            Remaining Refills
          </h3>
          <div className="border border-dark-200 dark:border-dark-600 rounded-lg overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead className="bg-dark-50 dark:bg-dark-600">
                <tr>
                  <th className="text-left py-2 px-3 text-xs font-semibold">
                    Product
                  </th>
                  <th className="text-left py-2 px-3 text-xs font-semibold">
                    Remaining
                  </th>
                </tr>
              </thead>
              <tbody>
                {customer.prepaidItems?.length ? (
                  customer.prepaidItems.map((item) => (
                    <tr
                      key={item.itemId}
                      className="border-t border-dark-200 dark:border-dark-600"
                    >
                      <td className="py-2 px-3 text-xs">{item.itemName}</td>
                      <td className="py-2 px-3 text-xs">
                        {item.quantityRemaining}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="py-4 px-3 text-xs text-dark-500" colSpan={2}>
                      No refill products found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="pt-2">
          <h3 className="text-sm font-semibold text-dark-900 dark:text-white mb-2">
            Orders & Refills
          </h3>
          <div className="border border-dark-200 dark:border-dark-600 rounded-lg overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead className="bg-dark-50 dark:bg-dark-600">
                <tr>
                  <th className="text-left py-2 px-3 text-xs font-semibold">
                    Order ID
                  </th>
                  <th className="text-left py-2 px-3 text-xs font-semibold">
                    Date
                  </th>
                  <th className="text-left py-2 px-3 text-xs font-semibold">
                    Items
                  </th>
                  <th className="text-left py-2 px-3 text-xs font-semibold">
                    Refill
                  </th>
                  <th className="text-left py-2 px-3 text-xs font-semibold">
                    Type
                  </th>
                  <th className="text-left py-2 px-3 text-xs font-semibold">
                    Total
                  </th>
                  <th className="text-left py-2 px-3 text-xs font-semibold">
                    Status
                  </th>
                  <th className="text-left py-2 px-3 text-xs font-semibold">
                    Payment
                  </th>
                </tr>
              </thead>
              <tbody>
                {customer.orderHistory?.length ? (
                  customer.orderHistory.map((order) => (
                    <tr
                      key={order.id}
                      className="border-t border-dark-200 dark:border-dark-600"
                    >
                      <td className="py-2 px-3 text-xs">{order.orderId}</td>
                      <td className="py-2 px-3 text-xs">
                        {formatDate(order.createdAt)}
                      </td>
                      <td className="py-2 px-3 text-xs">{order.itemsCount}</td>
                      <td className="py-2 px-3 text-xs">{order.refillCount}</td>
                      <td className="py-2 px-3 text-xs">
                        {getOrderType(order.itemsCount, order.refillCount)}
                      </td>
                      <td className="py-2 px-3 text-xs">
                        ${Number(order.totalPrice || 0).toFixed(2)}
                      </td>
                      <td className="py-2 px-3 text-xs">
                        <span className="px-2 py-1 rounded-md border border-dark-300 dark:border-dark-500">
                          {formatLabel(order.orderStatus)}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-xs">
                        <span className="px-2 py-1 rounded-md border border-dark-300 dark:border-dark-500">
                          {formatLabel(order.paymentStatus)}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="py-4 px-3 text-xs text-dark-500" colSpan={8}>
                      No orders found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
