"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown,
  Edit2,
  Trash2,
  Plus,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Link from "next/link";
import { Supplier } from "@/features/suppliers/types";
import { AddSupplierModal } from "@/features/suppliers/components/add-supplier-modal";
import { EditSupplierModal } from "@/features/suppliers/components/edit-supplier-modal";
import { DeleteSupplierModal } from "@/features/suppliers/components/delete-supplier-modal";
import { useSuppliers, queryKeys } from "@/lib/queries";
import { useQueryClient } from "@tanstack/react-query";
import { useDashboardRealtime } from "@/lib/use-dashboard-realtime";

export default function SuppliersPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const { data: rawSuppliers, isLoading: loading } = useSuppliers();
  const qc = useQueryClient();
  const invalidate = useCallback(() => {
    void qc.invalidateQueries({ queryKey: queryKeys.suppliers() });
  }, [qc]);

  useDashboardRealtime(invalidate);

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(
    null,
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const suppliers = useMemo((): Supplier[] => (rawSuppliers as any[] ?? []).map((s: any) => ({ ...s, id: s._id || s.id })), [rawSuppliers]);

  // Filter suppliers based on search
  const filteredSuppliers = useMemo(() => {
    return suppliers.filter(
      (supplier) =>
        supplier.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (supplier.email &&
          supplier.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (supplier.phone && supplier.phone.includes(searchQuery)),
    );
  }, [searchQuery, suppliers]);

  // Pagination
  const totalPages = Math.ceil(filteredSuppliers.length / itemsPerPage) || 1;
  const paginatedSuppliers = filteredSuppliers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  const handleEdit = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setIsEditModalOpen(true);
  };

  const handleDelete = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setIsDeleteModalOpen(true);
  };

  return (
    <div className="space-y-4 w-full overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <Link
          href="/dashboard/suppliers"
          className="text-xl md:text-2xl font-semibold text-dark-900 dark:text-white"
        >
          View Supplier List
        </Link>
        <div className="flex items-center gap-3 flex-wrap">
          <Button
            className="bg-[#0EA5E9] hover:bg-[#0284C7] text-white"
            onClick={() => setIsAddModalOpen(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Supplier
          </Button>
          <Button
            variant="outline"
            onClick={() => router.back()}
            className="border-[#0EA5E9] text-[#0EA5E9] hover:bg-[#0EA5E9]/10"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1 max-w-xs relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-dark-400 z-10" />
          <Input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Supplier"
            className="pl-10 h-11"
          />
        </div>
        <Button
          variant="outline"
          className="border-[#0EA5E9] text-[#0EA5E9] hover:bg-[#0EA5E9]/10"
        >
          <Filter className="h-4 w-4 mr-2" />
          Filters
        </Button>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-dark-700 rounded-xl border border-dark-200 dark:border-dark-600 shadow-sm dark:shadow-dark-900/50 p-4">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] md:min-w-0">
            <thead>
              <tr className="border-b border-dark-200 dark:border-dark-600 bg-dark-50 dark:bg-dark-600">
                <th className="text-left py-3 px-3 text-xs font-semibold text-dark-600 dark:text-dark-300">
                  <div className="flex items-center gap-1.5">
                    Supplier Name
                    <ArrowUpDown className="h-3.5 w-3.5 text-dark-400 dark:text-dark-500" />
                  </div>
                </th>
                <th className="text-left py-3 px-3 text-xs font-semibold text-dark-600 dark:text-dark-300">
                  <div className="flex items-center gap-1.5">
                    Phone Number
                    <ArrowUpDown className="h-3.5 w-3.5 text-dark-400 dark:text-dark-500" />
                  </div>
                </th>
                <th className="text-left py-3 px-3 text-xs font-semibold text-dark-600 dark:text-dark-300">
                  <div className="flex items-center gap-1.5">
                    Email
                    <ArrowUpDown className="h-3.5 w-3.5 text-dark-400 dark:text-dark-500" />
                  </div>
                </th>
                <th className="text-left py-3 px-3 text-xs font-semibold text-dark-600 dark:text-dark-300">
                  <div className="flex items-center gap-1.5">
                    Address
                    <ArrowUpDown className="h-3.5 w-3.5 text-dark-400 dark:text-dark-500" />
                  </div>
                </th>
                <th className="text-center py-3 px-3 text-xs font-semibold text-dark-600 dark:text-dark-300 w-[100px]">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-dark-400">
                    Loading suppliers...
                  </td>
                </tr>
              ) : paginatedSuppliers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-dark-400">
                    No suppliers found.
                  </td>
                </tr>
              ) : (
                paginatedSuppliers.map((supplier) => (
                  <tr
                    key={supplier.id}
                    className="border-b border-dark-200 dark:border-dark-600 last:border-0 hover:bg-dark-50 dark:hover:bg-dark-600 transition-colors"
                  >
                    <td className="py-3 px-3 text-sm text-dark-900 dark:text-white">
                      {supplier.name}
                    </td>
                    <td className="py-3 px-3 text-sm text-dark-900 dark:text-white">
                      {supplier.phone || "-"}
                    </td>
                    <td className="py-3 px-3 text-sm text-dark-900 dark:text-white">
                      {supplier.email || "-"}
                    </td>
                    <td className="py-3 px-3 text-sm text-dark-900 dark:text-white">
                      {supplier.address || "-"}
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleEdit(supplier)}
                          className="p-1.5 rounded-md hover:bg-[#0EA5E9]/10 text-[#0EA5E9] transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(supplier)}
                          className="p-1.5 rounded-md hover:bg-red-50 text-red-500 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4 pt-3 border-t border-dark-200 dark:border-dark-600">
          <div className="flex items-center gap-2">
            <span className="text-xs text-dark-600 dark:text-dark-400">
              Records per page
            </span>
            <Select
              value={itemsPerPage.toString()}
              onValueChange={(value) => {
                setItemsPerPage(Number(value));
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-20 h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="h-9 w-9"
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="h-9 w-9"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(3, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 3) {
                  pageNum = i + 1;
                } else if (currentPage === 1) {
                  pageNum = i + 1;
                } else if (currentPage === totalPages) {
                  pageNum = totalPages - 2 + i;
                } else {
                  pageNum = currentPage - 1 + i;
                }
                return (
                  <Button
                    key={pageNum}
                    variant={currentPage === pageNum ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(pageNum)}
                    className={`h-9 min-w-9 ${
                      currentPage === pageNum
                        ? "bg-[#0EA5E9] text-white hover:bg-[#0284C7]"
                        : "border-gray-300 text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    {pageNum}
                  </Button>
                );
              })}
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() =>
                setCurrentPage((prev) => Math.min(totalPages, prev + 1))
              }
              disabled={currentPage === totalPages}
              className="h-9 w-9"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              className="h-9 w-9"
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-xs text-dark-400 dark:text-dark-500 py-2">
        Copyright {new Date().getFullYear()} Water Shop. All Rights Reserved
      </div>

      {/* Modals */}
      <AddSupplierModal
        open={isAddModalOpen}
        onOpenChange={setIsAddModalOpen}
        onSuccess={invalidate}
      />
      <EditSupplierModal
        open={isEditModalOpen}
        onOpenChange={setIsEditModalOpen}
        supplier={selectedSupplier}
        onSuccess={invalidate}
      />
      <DeleteSupplierModal
        open={isDeleteModalOpen}
        onOpenChange={setIsDeleteModalOpen}
        supplier={selectedSupplier}
        onSuccess={invalidate}
      />
    </div>
  );
}
