"use client";

import { Delivery } from "../types";
import { Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DeliveriesTableProps {
  deliveries: Delivery[];
  onEdit: (delivery: Delivery) => void;
  onDelete: (delivery: Delivery) => void;
  onStatusChange: (deliveryId: string, status: Delivery["status"]) => void;
  statusOptions: readonly Delivery["status"][];
  onRowClick: (delivery: Delivery) => void;
}

function SortIcon() {
  return (
    <svg
      viewBox="0 0 10 12"
      className="h-3 w-3 inline-block ml-1"
      aria-hidden="true"
    >
      <path d="M5 0L9 4H1L5 0Z" fill="#0EA5E9" />
      <path d="M5 12L1 8H9L5 12Z" fill="#0EA5E9" />
    </svg>
  );
}

export function DeliveriesTable({
  deliveries,
  onEdit,
  onDelete,
  onStatusChange,
  statusOptions,
  onRowClick,
}: DeliveriesTableProps) {
  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full min-w-[700px] md:min-w-0 border-collapse">
        <thead>
          <tr className="border-b border-[#F1F5F9]">
            <th className="text-left py-3 px-4 text-sm font-semibold text-[#1E293B]">
              Customer <SortIcon />
            </th>
            <th className="text-left py-3 px-4 text-sm font-semibold text-[#1E293B]">
              Address <SortIcon />
            </th>
            <th className="text-left py-3 px-4 text-sm font-semibold text-[#1E293B]">
              Date &amp; Time <SortIcon />
            </th>
            <th className="text-center py-3 px-4 text-sm font-semibold text-[#1E293B]">
              Status <SortIcon />
            </th>
            <th className="text-center py-3 px-4 text-sm font-semibold text-[#1E293B]">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {deliveries.map((delivery) => (
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
