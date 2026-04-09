"use client";

import { useState, useMemo } from "react";
import { Order } from "../types";
import { Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  SortableHeader,
  SortState,
  toggleSort,
  applySortToItems,
} from "@/components/ui/sortable-header";

interface OrdersTableProps {
  orders: Order[];
  onEdit: (order: Order) => void;
  onDelete: (order: Order) => void;
  onStatusChange: (orderId: string, status: Order["orderStatus"]) => void;
  statusOptions: readonly Order["orderStatus"][];
  onRowClick: (order: Order) => void;
}

export function OrdersTable({
  orders,
  onEdit,
  onDelete,
  onStatusChange,
  statusOptions,
  onRowClick,
}: OrdersTableProps) {
  const [sort, setSort] = useState<SortState | null>(null);
  const handleSort = (key: string) => setSort((prev) => toggleSort(prev, key));

  const sortedOrders = useMemo(
    () =>
      applySortToItems(
        orders as unknown as Record<string, unknown>[],
        sort,
      ) as unknown as Order[],
    [orders, sort],
  );

  const getPaymentStatusBadgeClass = (status: string) => {
    switch (status) {
      case "Paid":
        return "bg-status-green-bg text-status-green-text";
      case "Unpaid":
        return "bg-status-red-bg text-status-red-text";
      case "Out Stock":
        return "bg-status-red-bg text-status-red-text";
      default:
        return "bg-dark-100 text-dark-600";
    }
  };

  const thCls = "py-2 px-3 text-xs font-semibold text-dark-600 dark:text-dark-300";

  return (
    <div className="bg-white dark:bg-dark-700 rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1200px] md:min-w-0">
          <thead>
            <tr className="border-b border-dark-200 dark:border-dark-600 bg-dark-50 dark:bg-dark-600">
              <SortableHeader label="Order ID" sortKey="orderId" sort={sort} onSort={handleSort} className={thCls} align="center" />
              <SortableHeader label="Customer" sortKey="customer" sort={sort} onSort={handleSort} className={thCls} align="center" />
              <SortableHeader label="Items" sortKey="items" sort={sort} onSort={handleSort} className={thCls} align="center" />
              <SortableHeader label="Grand Total" sortKey="grandTotal" sort={sort} onSort={handleSort} className={thCls} align="center" />
              <SortableHeader label="Delivery Type" sortKey="deliveryType" sort={sort} onSort={handleSort} className={thCls} align="center" />
              <SortableHeader label="Refill" sortKey="remainingCredits" sort={sort} onSort={handleSort} className={thCls} align="center" />
              <SortableHeader label="Order Status" sortKey="orderStatus" sort={sort} onSort={handleSort} className={thCls} align="center" />
              <SortableHeader label="Payment Status" sortKey="paymentStatus" sort={sort} onSort={handleSort} className={thCls} align="center" />
              <th className="text-center py-2 px-3 text-xs font-semibold text-dark-600 dark:text-dark-300">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedOrders.map((order) => {
              const totalItems = (order.items || []).length;
              return (
                <tr
                  key={order.id}
                  className="border-b border-dark-200 dark:border-dark-600 last:border-0 hover:bg-dark-50 dark:hover:bg-dark-600 transition-colors cursor-pointer"
                  onClick={() => onRowClick(order)}
                >
                  <td className="py-2 px-3 text-xs text-dark-900 dark:text-white font-medium text-center">
                    {order.orderId}
                  </td>
                  <td className="py-2 px-3 text-xs text-dark-900 dark:text-white text-center">
                    {order.customer}
                  </td>
                  <td className="py-2 px-3 text-xs text-dark-900 dark:text-white text-center">
                    {totalItems} items
                  </td>
                  <td className="py-2 px-3 text-xs text-dark-900 dark:text-white font-medium text-center">
                    ${(order?.grandTotal ?? order?.totalPrice ?? 0).toFixed(2)}
                  </td>
                  <td className="py-2 px-3 text-xs text-dark-900 dark:text-white text-center">
                    {order.deliveryType}
                  </td>
                  <td className="py-2 px-3 text-xs text-dark-900 dark:text-white text-center">
                    {order.remainingCredits} Refill
                  </td>
                  <td className="py-2 px-3 text-center">
                    <select
                      value={order.orderStatus}
                      onChange={(e) => {
                        e.stopPropagation();
                        onStatusChange(order.id, e.target.value as Order["orderStatus"]);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="h-7 rounded-md border border-dark-200 bg-white px-2 text-xs text-dark-900 dark:border-dark-500 dark:bg-dark-700 dark:text-white"
                    >
                      {statusOptions.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-2 px-3 text-center">
                    <span
                      className={cn(
                        "inline-flex items-center justify-center px-2 py-0.5 rounded-md text-xs font-medium whitespace-nowrap w-20",
                        getPaymentStatusBadgeClass(order.paymentStatus),
                      )}
                    >
                      {order.paymentStatus}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(event) => {
                          event.stopPropagation();
                          onEdit(order);
                        }}
                        className="h-7 w-7 text-primary-500 hover:text-primary-600 hover:bg-primary-100 dark:hover:bg-primary-900/20"
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(event) => {
                          event.stopPropagation();
                          onDelete(order);
                        }}
                        className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-100 dark:hover:bg-red-900/20"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
