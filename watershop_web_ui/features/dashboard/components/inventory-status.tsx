import Link from "next/link";
import { InventoryItem } from "../types";
import { cn } from "@/lib/utils";

interface InventoryStatusProps {
  items: InventoryItem[];
}

function SortIcon() {
  return (
    <span className="inline-flex flex-col ml-1.5 align-middle" style={{ gap: "1px" }}>
      <svg width="7" height="4" viewBox="0 0 7 4" fill="#3B82F6">
        <path d="M3.5 0L6.5 4H0.5L3.5 0Z" />
      </svg>
      <svg width="7" height="4" viewBox="0 0 7 4" fill="#3B82F6">
        <path d="M3.5 4L0.5 0H6.5L3.5 4Z" />
      </svg>
    </span>
  );
}

export function InventoryStatus({ items }: InventoryStatusProps) {
  return (
    <div className="bg-white dark:bg-dark-700 rounded-xl border border-dark-200 dark:border-dark-600 shadow-sm dark:shadow-dark-900/50 p-5 flex flex-col w-full overflow-hidden">
      <div className="flex items-center justify-between mb-4 shrink-0">
        <h2 className="text-lg font-bold text-dark-900 dark:text-white">Inventory Status</h2>
        <Link
          href="/dashboard/inventory"
          className="text-sm text-primary-500 dark:text-primary-400 hover:text-primary-600 dark:hover:text-primary-300 font-semibold"
        >
          View All
        </Link>
      </div>
      <div className="overflow-x-auto min-w-0 -mx-5 px-5 md:mx-0 md:px-0">
        <table className="w-full min-w-[400px] md:min-w-0">
          <thead>
            <tr className="border-b border-dark-200 dark:border-dark-600">
              <th className="text-left pb-2 px-2 text-sm font-semibold text-dark-900 dark:text-white">
                Product <SortIcon />
              </th>
              <th className="text-left pb-2 px-2 text-sm font-semibold text-dark-900 dark:text-white">
                Stock Left <SortIcon />
              </th>
              <th className="text-right pb-2 px-2 text-sm font-semibold text-dark-900 dark:text-white">
                Status <SortIcon />
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr
                key={item.id}
                className="border-b border-dark-200 dark:border-dark-600 last:border-0 hover:bg-dark-50 dark:hover:bg-dark-600 transition-colors"
              >
                <td className="py-2 px-2 text-sm text-dark-700 dark:text-dark-200 whitespace-nowrap text-left">
                  {item.product}
                </td>
                <td className="py-2 px-2 text-sm text-dark-700 dark:text-dark-200 whitespace-nowrap text-left">
                  {item.stockLeft}
                </td>
                <td className="py-2 px-2 whitespace-nowrap text-right">
                  <span
                    className={cn(
                      "inline-flex items-center justify-center px-3 py-1 rounded-lg text-sm font-medium whitespace-nowrap min-w-[84px]",
                      item.status === "In Stock"
                        ? "bg-status-green-bg text-status-green-text"
                        : "bg-status-red-bg text-status-red-text"
                    )}
                  >
                    {item.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}