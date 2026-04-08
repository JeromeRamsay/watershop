"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { SearchBar } from "@/features/inventory/components/search-bar";
import { InventoryTable } from "@/features/inventory/components/inventory-table";
import { FiltersModal } from "@/features/inventory/components/filters-modal";
import { AddItemModal } from "@/features/inventory/components/add-item-modal";
import { EditItemModal } from "@/features/inventory/components/edit-item-modal";
import { DeleteItemModal } from "@/features/inventory/components/delete-item-modal";
import { ItemDetailsModal } from "@/features/inventory/components/item-details-modal";
import { InventoryItem, InventoryFilters } from "@/features/inventory/types";

const categories = ["Water", "Accessories", "Bottles", "Dispensers"];
const statuses = ["In Stock", "Low Stock", "Out Stock"];

import {
  Filter,
  Plus,
  Download,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Loader2,
} from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import api from "@/lib/api";
import { Supplier } from "@/features/suppliers/types";
import { useDashboardRealtime } from "@/lib/use-dashboard-realtime";
import { useInventory, useSuppliers, queryKeys } from "@/lib/queries";
import { useQueryClient } from "@tanstack/react-query";

interface InventoryApiItem {
  _id?: string;
  id?: string;
  name: string;
  sku: string;
  category: string;
  stockQuantity: number;
  lowStockThreshold?: number;
  unitType: string;
  purchasePrice: number;
  sellingPrice: number;
  supplier?: string;
  description?: string;
  isTaxable?: boolean;
  isRefillable?: boolean;
  refillPrice?: number;
  rentalPrice?: number;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export default function InventoryPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<InventoryFilters>({
    category: "All",
    status: "All",
  });
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isDetailsLoading, setIsDetailsLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const { data: inventoryData, isLoading: l1 } = useInventory();
  const { data: suppliersData, isLoading: l2 } = useSuppliers();
  const loading = l1 || l2;
  const qc = useQueryClient();
  const invalidate = useCallback(() => {
    void qc.invalidateQueries({ queryKey: queryKeys.inventory() });
  }, [qc]);

  useDashboardRealtime(invalidate);

  const items = useMemo((): InventoryItem[] => {
    const raw = (inventoryData as InventoryApiItem[] | undefined) ?? [];
    return [...raw]
      .sort((a, b) =>
        new Date(b.createdAt ?? b.updatedAt ?? 0).getTime() -
        new Date(a.createdAt ?? a.updatedAt ?? 0).getTime(),
      )
      .map((item) => {
        const qty = item.stockQuantity;
        const status: "In Stock" | "Low Stock" | "Out Stock" =
          qty > (item.lowStockThreshold ?? 10) ? "In Stock" : qty > 0 ? "Low Stock" : "Out Stock";
        return {
          id: item._id ?? item.id ?? "",
          sku: item.sku,
          itemName: item.name,
          category: item.category,
          stock: qty,
          lastUpdated: new Date(item.updatedAt ?? Date.now()).toLocaleDateString("en-GB"),
          status,
          unitType: item.unitType,
          purchasePrice: item.purchasePrice,
          sellingPrice: item.sellingPrice,
          supplier: item.supplier ?? "",
          description: item.description ?? "",
          lowStockThreshold: item.lowStockThreshold ?? 0,
          isTaxable: item.isTaxable ?? false,
          isRefillable: item.isRefillable ?? false,
          refillPrice: item.refillPrice ?? 0,
          rentalPrice: item.rentalPrice ?? 0,
          isActive: item.isActive ?? true,
          createdAt: item.createdAt ?? "",
          updatedAt: item.updatedAt ?? "",
        };
      });
  }, [inventoryData]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const suppliers = useMemo((): Supplier[] => ((suppliersData as any[] | undefined) ?? []).map((s: any) => ({ ...s, id: s._id || s.id })), [suppliersData]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch =
        item.itemName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.sku.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory =
        filters.category === "All" || item.category === filters.category;
      const matchesStatus =
        filters.status === "All" || item.status === filters.status;
      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [items, searchQuery, filters]);

  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const paginatedItems = filteredItems.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  const handleEdit = (item: InventoryItem) => {
    setSelectedItem(item);
    setIsEditModalOpen(true);
  };

  const handleDelete = (item: InventoryItem) => {
    setSelectedItem(item);
    setIsDeleteModalOpen(true);
  };

  const handleRowClick = async (item: InventoryItem) => {
    try {
      setSelectedItem(item);
      setIsDetailsModalOpen(true);
      setIsDetailsLoading(true);

      const { data } = await api.get<InventoryApiItem>(`/inventory/${item.id}`);

      setSelectedItem({
        id: data._id || data.id || item.id,
        sku: data.sku || item.sku,
        itemName: data.name || item.itemName,
        category: data.category || item.category,
        stock: data.stockQuantity ?? item.stock,
        lastUpdated: new Date(
          data.updatedAt || data.createdAt || Date.now(),
        ).toLocaleDateString("en-GB"),
        status:
          (data.stockQuantity ?? item.stock) > (data.lowStockThreshold || 10)
            ? "In Stock"
            : (data.stockQuantity ?? item.stock) > 0
              ? "Low Stock"
              : "Out Stock",
        unitType: data.unitType || item.unitType,
        purchasePrice: data.purchasePrice ?? item.purchasePrice,
        sellingPrice: data.sellingPrice ?? item.sellingPrice,
        supplier: data.supplier || item.supplier,
        description: data.description || item.description,
        lowStockThreshold: data.lowStockThreshold ?? item.lowStockThreshold,
        isTaxable: data.isTaxable ?? item.isTaxable,
        isRefillable: data.isRefillable ?? item.isRefillable,
        refillPrice: data.refillPrice ?? item.refillPrice,
        rentalPrice: data.rentalPrice ?? item.rentalPrice,
        isActive: data.isActive ?? item.isActive,
        createdAt: data.createdAt ?? item.createdAt,
        updatedAt: data.updatedAt ?? item.updatedAt,
      });
    } catch (error) {
      console.error("Failed to fetch item details", error);
    } finally {
      setIsDetailsLoading(false);
    }
  };

  const handleExportCSV = () => {
    const csv = [
      ["SKU", "Item Name", "Category", "Stock", "Status", "Last Updated"].join(
        ",",
      ),
      ...filteredItems.map((item) =>
        [
          item.sku,
          item.itemName,
          item.category,
          item.stock,
          item.status,
          item.lastUpdated,
        ].join(","),
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `inventory-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  // ---- design-matching button styles (no behavior changes) ----
  const outlineBlue =
    "h-9 rounded-lg border border-[#A7DCFF] bg-white text-[#0EA5E9] hover:bg-[#EAF7FF] hover:text-[#0EA5E9]";

  const solidBlue = "h-9 rounded-lg bg-[#0EA5E9] text-white hover:bg-[#0284C7]";

  const neutralOutline =
    "h-9 rounded-lg border border-[#E5E7EB] bg-white text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#6B7280]";

  return (
    <div className="w-full overflow-x-hidden bg-[#F6F8FB]">
      <div className="space-y-4 px-6 py-5">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <h1 className="text-[22px] font-semibold text-[#111827]">
            Inventory Management
          </h1>

          <div className="flex items-center gap-3 flex-wrap">
            <Button className={solidBlue} onClick={() => router.push("/dashboard/orders/new")}>New Order</Button>

            <Button
              variant="outline"
              onClick={() => router.push("/dashboard/suppliers")}
              className={outlineBlue}
            >
              View Supplier List
            </Button>

            <Button
              variant="outline"
              onClick={() => setIsAddModalOpen(true)}
              className={outlineBlue}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Inventory Item
            </Button>

            <Button
              variant="outline"
              onClick={handleExportCSV}
              className={outlineBlue}
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Inventory Table Section */}
        <div className="bg-white rounded-xl border border-[#EEF2F7] shadow-[0_6px_18px_rgba(17,24,39,0.06)] p-4">
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-[#0EA5E9]" />
            </div>
          ) : (
            <div className="space-y-3">
              {/* Search and Filters Row */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 max-w-[260px]">
                  {/* Make sure SearchBar placeholder is "Search Item" to match design */}
                  <SearchBar value={searchQuery} onChange={setSearchQuery} />
                </div>

                <Button
                  variant="outline"
                  onClick={() => setIsFiltersOpen(true)}
                  className={neutralOutline}
                >
                  <Filter className="h-4 w-4 mr-2 text-[#6B7280]" />
                  Filters
                </Button>
              </div>

              <InventoryTable
                items={paginatedItems}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onRowClick={handleRowClick}
              />
            </div>
          )}

          {/* Pagination */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4 pt-3 border-t border-[#EEF2F7]">
            <div className="flex items-center gap-3">
              <Select
                value={itemsPerPage.toString()}
                onValueChange={(value) => {
                  setItemsPerPage(Number(value));
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="w-[72px] h-9 rounded-lg border border-[#E5E7EB] bg-white shadow-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>

              <span className="text-sm text-[#6B7280]">Records per page</span>
            </div>

            <div className="flex items-center gap-2">
              {/* icon buttons look like plain grey controls in design (no borders) */}
              <button
                type="button"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="h-9 w-9 grid place-items-center rounded-lg text-[#9CA3AF] hover:bg-[#F3F4F6] disabled:opacity-50"
              >
                <ChevronsLeft className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="h-9 w-9 grid place-items-center rounded-lg text-[#9CA3AF] hover:bg-[#F3F4F6] disabled:opacity-50"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <div className="flex items-center gap-2">
                {Array.from({ length: Math.min(3, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 3) pageNum = i + 1;
                  else if (currentPage === 1) pageNum = i + 1;
                  else if (currentPage === totalPages)
                    pageNum = totalPages - 2 + i;
                  else pageNum = currentPage - 1 + i;

                  const isActive = currentPage === pageNum;

                  return (
                    <button
                      key={pageNum}
                      type="button"
                      onClick={() => setCurrentPage(pageNum)}
                      className={[
                        "h-9 w-9 rounded-lg text-sm",
                        isActive
                          ? "bg-[#EAF7FF] text-[#0EA5E9]"
                          : "text-[#9CA3AF] hover:bg-[#F3F4F6]",
                      ].join(" ")}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() =>
                  setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                }
                disabled={currentPage === totalPages}
                className="h-9 w-9 grid place-items-center rounded-lg text-[#9CA3AF] hover:bg-[#F3F4F6] disabled:opacity-50"
              >
                <ChevronRight className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="h-9 w-9 grid place-items-center rounded-lg text-[#9CA3AF] hover:bg-[#F3F4F6] disabled:opacity-50"
              >
                <ChevronsRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-end text-sm text-[#9CA3AF] pt-2">
          Copyright {new Date().getFullYear()} Water Shop. All Rights Reserved
        </div>
      </div>

      {/* Modals */}
      <FiltersModal
        open={isFiltersOpen}
        onOpenChange={setIsFiltersOpen}
        filters={filters}
        onFiltersChange={setFilters}
        categories={categories}
        statuses={statuses}
      />

      <AddItemModal
        open={isAddModalOpen}
        onOpenChange={setIsAddModalOpen}
        onSuccess={invalidate}
        categories={categories}
        suppliers={suppliers}
      />

      <EditItemModal
        open={isEditModalOpen}
        onOpenChange={setIsEditModalOpen}
        item={selectedItem}
        onSuccess={invalidate}
        categories={categories}
        suppliers={suppliers}
      />

      <DeleteItemModal
        open={isDeleteModalOpen}
        onOpenChange={setIsDeleteModalOpen}
        item={selectedItem}
        onSuccess={invalidate}
      />

      <ItemDetailsModal
        open={isDetailsModalOpen}
        onOpenChange={setIsDetailsModalOpen}
        item={selectedItem}
        loading={isDetailsLoading}
        categories={categories}
        suppliers={suppliers}
        onSuccess={invalidate}
        onItemUpdated={setSelectedItem}
      />
    </div>
  );
}
