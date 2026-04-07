"use client";

import { InventoryItem } from "../types";
import { Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface InventoryTableProps {
  items: InventoryItem[];
  onEdit: (item: InventoryItem) => void;
  onDelete: (item: InventoryItem) => void;
  onRowClick: (item: InventoryItem) => void;
}

/** Matches the small blue double-triangle sort icon in the design */
function SortIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 10 12"
      className={cn("h-3 w-3", className)}
      aria-hidden="true"
    >
      <path d="M5 0L9 4H1L5 0Z" fill="#0EA5E9" />
      <path d="M5 12L1 8H9L5 12Z" fill="#0EA5E9" />
    </svg>
  );
}

export function InventoryTable({
  items,
  onEdit,
  onDelete,
  onRowClick,
}: InventoryTableProps) {
  const getStatusStyles = (status: string) => {
    switch (status.toLowerCase()) {
      case "in stock":
        return { backgroundColor: "#48B97224", color: "#48B97C" };
      case "low stock":
        return { backgroundColor: "#FF993324", color: "#FF9933" };
      case "out stock":
      case "out of stock":
      case "out stock ":
        return { backgroundColor: "#FF7A7A24", color: "#FF7A7A" };
      default:
        return { backgroundColor: "#F3F4F6", color: "#6B7280" };
    }
  };

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full min-w-[900px] border-collapse">
        <thead>
          <tr className="border-b border-[#EEF2F7] bg-white">
            <th className="px-4 py-2.5 text-left text-xs font-bold text-[#6B7280]">
              <div className="inline-flex items-center gap-2 ">
                SKU/Item Code
                <SortIcon />
              </div>
            </th>
            <th className="px-4 py-2.5 text-left text-xs font-bold text-[#6B7280]">
              <div className="inline-flex items-center gap-2">
                Item Name
                <SortIcon />
              </div>
            </th>
            <th className="px-4 py-2.5 text-left text-xs font-bold text-[#6B7280]">
              <div className="inline-flex items-center gap-2">
                Category
                <SortIcon />
              </div>
            </th>
            <th className="px-4 py-2.5 text-left text-xs font-bold text-[#6B7280]">
              <div className="inline-flex items-center gap-2">
                Stock
                <SortIcon />
              </div>
            </th>
            <th className="px-4 py-2.5 text-left text-xs font-bold text-[#6B7280]">
              <div className="inline-flex items-center gap-2">
                Last Updated
                <SortIcon />
              </div>
            </th>
            <th className="px-4 py-2.5 text-left text-xs font-bold text-[#6B7280]">
              <div className="inline-flex items-center gap-2">
                Status
                <SortIcon />
              </div>
            </th>
            <th className="px-4 py-2.5 text-center text-xs font-bold text-[#6B7280]">
              Actions
            </th>
          </tr>
        </thead>

        <tbody>
          {items.map((item, index) => (
            <tr
              key={`${item.id ?? item.sku}-${index}`}
              className="border-b border-[#F1F5F9] last:border-0 hover:bg-[#FAFBFC] cursor-pointer"
              onClick={() => onRowClick(item)}
            >
              <td className="px-4 py-2 text-xs text-[#374151]">{item.sku}</td>
              <td className="px-4 py-2 text-xs text-[#374151]">{item.itemName}</td>
              <td className="px-4 py-2 text-xs text-[#6B7280]">{item.category}</td>
              <td className="px-4 py-2 text-xs text-[#374151]">{item.stock}</td>
              <td className="px-4 py-2 text-xs text-[#6B7280]">{item.lastUpdated}</td>
              <td className="px-4 py-2">
                <span
                  className="inline-flex w-[76px] items-center justify-center rounded-md px-2 py-0.5 text-[11px] font-medium"
                  style={getStatusStyles(item.status)}
                >
                  {item.status}
                </span>
              </td>
              <td className="px-4 py-2">
                <div className="flex items-center justify-center gap-3">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={(event) => {
                      event.stopPropagation();
                      onEdit(item);
                    }}
                    className="h-7 w-7 rounded-md bg-transparent p-0 text-[#0EA5E9] hover:bg-transparent hover:text-[#0284C7]"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={(event) => {
                      event.stopPropagation();
                      onDelete(item);
                    }}
                    className="h-7 w-7 rounded-md bg-transparent p-0 text-[#EF4444] hover:bg-transparent hover:text-[#DC2626]"
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
