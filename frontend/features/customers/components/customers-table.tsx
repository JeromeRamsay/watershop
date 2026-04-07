"use client";

import { Customer } from "../types";
import { Edit, Trash2, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";

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
  return (
    <div className="bg-white dark:bg-dark-700 rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1200px] md:min-w-0">
          <thead>
            <tr className="border-b border-dark-200 dark:border-dark-600 bg-dark-50 dark:bg-dark-600">
              <th className="text-center py-2 px-3 text-xs font-semibold text-dark-600 dark:text-dark-300">
                <div className="flex items-center justify-center gap-1.5">
                  Customer
                  <ArrowUpDown className="h-3.5 w-3.5 text-dark-400 dark:text-dark-500" />
                </div>
              </th>
              <th className="text-center py-2 px-3 text-xs font-semibold text-dark-600 dark:text-dark-300">
                <div className="flex items-center justify-center gap-1.5">
                  Email
                  <ArrowUpDown className="h-3.5 w-3.5 text-dark-400 dark:text-dark-500" />
                </div>
              </th>
              <th className="text-center py-2 px-3 text-xs font-semibold text-dark-600 dark:text-dark-300">
                <div className="flex items-center justify-center gap-1.5">
                  Address
                  <ArrowUpDown className="h-3.5 w-3.5 text-dark-400 dark:text-dark-500" />
                </div>
              </th>
              <th className="text-center py-2 px-3 text-xs font-semibold text-dark-600 dark:text-dark-300">
                <div className="flex items-center justify-center gap-1.5">
                  Orders
                  <ArrowUpDown className="h-3.5 w-3.5 text-dark-400 dark:text-dark-500" />
                </div>
              </th>
              <th className="text-center py-2 px-3 text-xs font-semibold text-dark-600 dark:text-dark-300">
                <div className="flex items-center justify-center gap-1.5">
                  Credits Left
                  <ArrowUpDown className="h-3.5 w-3.5 text-dark-400 dark:text-dark-500" />
                </div>
              </th>
              <th className="text-center py-2 px-3 text-xs font-semibold text-dark-600 dark:text-dark-300">
                <div className="flex items-center justify-center gap-1.5">
                  Family Group
                  <ArrowUpDown className="h-3.5 w-3.5 text-dark-400 dark:text-dark-500" />
                </div>
              </th>
              <th className="text-center py-2 px-3 text-xs font-semibold text-dark-600 dark:text-dark-300">Actions</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((customer) => (
              <tr
                key={customer.id}
                className="border-b border-dark-200 dark:border-dark-600 last:border-0 hover:bg-dark-50 dark:hover:bg-dark-600 transition-colors cursor-pointer"
                onClick={() => onViewDetails(customer)}
              >
                <td className="py-2 px-3 text-xs text-dark-900 dark:text-white text-center font-medium">
                  {customer.name}
                </td>
                <td className="py-2 px-3 text-xs text-dark-900 dark:text-white text-center">{customer.email}</td>
                <td className="py-2 px-3 text-xs text-dark-900 dark:text-white text-center">{customer.address}</td>
                <td className="py-2 px-3 text-xs text-dark-900 dark:text-white text-center">{customer.orders}</td>
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
