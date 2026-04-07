"use client";

import { useState, useMemo } from "react";
import { Delivery } from "../types";
import { Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  SortableHeader,
  SortState,
  toggleSort,
  applySortToItems,
} from "@/components/ui/sortable-header";

interface DeliveriesTableProps {
  deliveries: Delivery[];
  onEdit: (delivery: Delivery) => void;
  onDelete: (delivery: Delivery) => void;
  onStatusChange: (deliveryId: string, status: Delivery["status"]) => void;
  statusOptions: readonly Delivery["status"][];
  onRowClick: (delivery: Delivery) => void;
}

export function DeliveriesTable({
  deliveries,
  onEdit,
  onDelete,
  onStatusChange,
  statusOptions,
  onRowClick,
}: DeliveriesTableProps) {
  const [sort, setSort] = useState<SortState | null>(null);
  const handleSort = (key: string) => setSort((prev) => toggleSort(prev, key));

  const sortedDeliveries = useMemo(
    () =>
      applySortToItems(
        deliveries as unknown as Record<string, unknown>[],
        sort,
      ) as unknown as Delivery[],
    [deliveries, sort],
  );

  const thCls = "py-3 px-4 text-sm font-semibold text-[#1E293B]";

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full min-w-[700px] md:min-w-0 border-collapse">
        <thead>
          <tr className="border-b border-[#F1F5F9]">
            <SortableHeader
              label="Customer"
              sortKey="customer"
              sort={sort}
              onSort={handleSort}
              className={thCls}
              align="left"
            />
            <SortableHeader
              label="Address"
              sortKey="address"
              sort={sort}
              onSort={handleSort}
              className={thCls}
              align="left"
            />
            <SortableHeader
              label="Date & Time"
              sortKey="dateTime"
              sort={sort}
              onSort={handleSort}
              className={thCls}
              align="left"
            />
            <SortableHeader
              label="Status"
              sortKey="status"
              sort={sort}
              onSort={handleSort}
              className={thCls}
              align="center"
            />
            <th className="text-center py-3 px-4 text-sm font-semibold text-[#1E293B]">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedDeliveries.map((delivery) => (
            <tr
              key={delivery.id}
              className="border-b border-[#F1F5F9] last:border-0 hover:bg-[#FAFBFC] transition-colors cursor-pointer"
              onClick={() => onRowClick(delivery)}
            >
              <td className="py-3 px-4 text-sm text-[#374151] font-medium whitespace-nowrap">
                {delivery.customer}
              </td>
              <td className="py-3 px-4 text-sm text-[#374151]">
                {delivery.address}
              </td>
              <td className="py-3 px-4 text-sm text-[#374151] whitespace-nowrap">
                {delivery.dateTime}
              </td>
              <td className="py-3 px-4 text-center">
                <select
                  value={delivery.status}
                  onChange={(e) => {
                    e.stopPropagation();
                    onStatusChange(
                      delivery.id,
                      e.target.value as Delivery["status"],
                    );
                  }}
                  onClick={(event) => event.stopPropagation()}
                  className="h-7 rounded-md border border-[#E2E8F0] bg-white px-2 text-xs text-[#1E293B]"
                >
                  {statusOptions.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </td>
              <td className="py-3 px-4">
                <div className="flex items-center justify-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(event) => {
                      event.stopPropagation();
                      onEdit(delivery);
                    }}
                    className="h-7 w-7 text-[#0EA5E9] hover:text-[#0284C7] hover:bg-transparent bg-transparent p-0"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(event) => {
                      event.stopPropagation();
                      onDelete(delivery);
                    }}
                    className="h-7 w-7 text-[#EF4444] hover:text-[#DC2626] hover:bg-transparent bg-transparent p-0"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
