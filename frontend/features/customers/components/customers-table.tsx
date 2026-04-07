"use client";

import { useState, useMemo } from "react";
import { Customer } from "../types";
import { Edit, Trash2, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  SortableHeader,
  SortState,
  toggleSort,
  applySortToItems,
} from "@/components/ui/sortable-header";

interface CustomersTableProps {
  customers: Customer[];
  onEdit: (customer: Customer) => void;
  onDelete: (customer: Customer) => void;
  onViewDetails: (customer: Customer) => void;
}

export function CustomersTable({
  customers,
  onEdit,
  onDelete,
  onViewDetails,
}: CustomersTableProps) {
  const [sort, setSort] = useState<SortState | null>(null);
  const handleSort = (key: string) => setSort((prev) => toggleSort(prev, key));

  const sortedCustomers = useMemo(
    () =>
      applySortToItems(
        customers as unknown as Record<string, unknown>[],
        sort,
      ) as unknown as Customer[],
    [customers, sort],
  );

  const thCls =
    "py-2 px-3 text-xs font-semibold text-dark-600 dark:text-dark-300";

  return (
    <div className="bg-white dark:bg-dark-700 rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1200px] md:min-w-0">
          <thead>
            <tr className="border-b border-dark-200 dark:border-dark-600 bg-dark-50 dark:bg-dark-600">
              <SortableHeader
                label="Customer"
                sortKey="name"
                sort={sort}
                onSort={handleSort}
                className={thCls}
                align="center"
              />
              <SortableHeader
                label="Email"
                sortKey="email"
                sort={sort}
                onSort={handleSort}
                className={thCls}
                align="center"
              />
              <SortableHeader
                label="Address"
                sortKey="address"
                sort={sort}
                onSort={handleSort}
                className={thCls}
                align="center"
              />
              <SortableHeader
                label="Orders"
                sortKey="orders"
                sort={sort}
                onSort={handleSort}
                className={thCls}
                align="center"
              />
              <SortableHeader
                label="Credits Left"
                sortKey="creditsLeft"
                sort={sort}
                onSort={handleSort}
                className={thCls}
                align="center"
              />
              <SortableHeader
                label="Family Group"
                sortKey="familyGroup"
                sort={sort}
                onSort={handleSort}
                className={thCls}
                align="center"
              />
              <th className="text-center py-2 px-3 text-xs font-semibold text-dark-600 dark:text-dark-300">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedCustomers.map((customer) => (
              <tr
                key={customer.id}
                className="border-b border-dark-200 dark:border-dark-600 last:border-0 hover:bg-dark-50 dark:hover:bg-dark-600 transition-colors cursor-pointer"
                onClick={() => onViewDetails(customer)}
              >
                <td className="py-2 px-3 text-xs text-dark-900 dark:text-white text-center font-medium">
                  {customer.name}
                </td>
                <td className="py-2 px-3 text-xs text-dark-900 dark:text-white text-center">
                  {customer.email}
                </td>
                <td className="py-2 px-3 text-xs text-dark-900 dark:text-white text-center">
                  {customer.address}
                </td>
                <td className="py-2 px-3 text-xs text-dark-900 dark:text-white text-center">
                  {customer.orders}
                </td>
                <td className="py-2 px-3 text-xs text-dark-900 dark:text-white text-center">
                  {customer.creditsLeft} Bottles
                </td>
                <td className="py-2 px-3 text-xs text-dark-900 dark:text-white text-center">
                  {customer.familyGroup || "-"}
                </td>
                <td className="py-2 px-3 text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(event) => {
                        event.stopPropagation();
                        onEdit(customer);
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
                        onDelete(customer);
                      }}
                      className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-100 dark:hover:bg-red-900/20"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
