"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { SearchBar } from "@/features/customers/components/search-bar";
import { CustomersTable } from "@/features/customers/components/customers-table";
import { FiltersModal } from "@/features/customers/components/filters-modal";
import { DeleteCustomerModal } from "@/features/customers/components/delete-customer-modal";
import { CreateCustomerModal } from "@/features/customers/components/create-customer-modal";
import { CustomerDetailsModal } from "@/features/customers/components/customer-details-modal";
import { Customer, CustomerFilters } from "@/features/customers/types";
const customerTypes = ["Individual", "Business"];
const customerStatuses = ["Active", "Inactive"];
import {
  Filter,
  ShoppingCart,
  Download,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Plus,
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
import { useDashboardRealtime } from "@/lib/use-dashboard-realtime";

export default function CustomersPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<CustomerFilters>({
    customerType: "All",
    status: "All",
  });
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null,
  );
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  const mapCustomer = useCallback((c: any): Customer => {
    const defaultAddress = c.addresses?.find((a: any) => a.isDefault) || c.addresses?.[0];
    const addressStr = defaultAddress
      ? `${defaultAddress.street || ""}${defaultAddress.city ? `, ${defaultAddress.city}` : ""}`.trim()
      : "No Address";
    const creditsLeft =
      c.wallet?.prepaidItems?.reduce(
        (sum: number, item: any) => sum + (item.quantityRemaining || 0),
        0,
      ) || 0;

    return {
      id: c._id,
      name: `${c.firstName || ""} ${c.lastName || ""}`.trim(),
      email: c.email || "",
      phone: c.phone || "",
      address: addressStr || "No Address",
      orders: Number(c.orders || 0),
      creditsLeft,
      prepaidItems: c.wallet?.prepaidItems || [],
      familyGroup:
        c.familyMembers?.length > 0 ? `${c.familyMembers.length} Members` : null,
      customerType: c.type === "business" ? "Business" : "Individual",
      status: "Active",
      totalRefills: Number(c.totalRefills || 0),
      orderHistory: [],
    };
  }, []);

  const fetchCustomers = useCallback(async (silent = false) => {
    try {
      if (!silent) {
        setLoading(true);
      }
      const typeQuery =
        filters.customerType === "All"
          ? ""
          : filters.customerType.toLowerCase();
      const { data } = await api.get("/customers", {
        params: {
          page: currentPage,
          limit: itemsPerPage,
          q: searchQuery.trim() || undefined,
          type: typeQuery || undefined,
        },
      });

      const mappedCustomers: Customer[] = (data?.data || []).map(mapCustomer);
      setCustomers(mappedCustomers);
      setTotalPages(Number(data?.pagination?.totalPages || 1));
      setTotalRecords(Number(data?.pagination?.total || 0));
    } catch (error) {
      console.error("Failed to fetch customers", error);
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, [
    currentPage,
    filters.customerType,
    itemsPerPage,
    mapCustomer,
    searchQuery,
  ]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      fetchCustomers();
    }, 300);
    return () => clearTimeout(timeout);
  }, [fetchCustomers]);

  useDashboardRealtime(() => {
    fetchCustomers(true);
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [itemsPerPage, filters.customerType, searchQuery]);

  const handleEdit = (customer: Customer) => {
    router.push(`/dashboard/customers/${customer.id}/edit`);
  };

  const handleDelete = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsDeleteModalOpen(true);
  };

  const handleViewDetails = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsDetailsModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (selectedCustomer) {
      try {
        await api.delete(`/customers/${selectedCustomer.id}`);
        fetchCustomers(true);
        setSelectedCustomer(null);
        setIsDeleteModalOpen(false); // Make sure to close modal
      } catch (error) {
        console.error("Failed to delete customer", error);
      }
    }
  };

  const handleExportCSV = async () => {
    try {
      const typeQuery =
        filters.customerType === "All"
          ? ""
          : filters.customerType.toLowerCase();
      const { data } = await api.get("/customers", {
        params: {
          page: 1,
          limit: 5000,
          q: searchQuery.trim() || undefined,
          type: typeQuery || undefined,
        },
      });

      const exportCustomers: Customer[] = (data?.data || []).map(mapCustomer);
      const csv = [
        [
          "Customer",
          "Email",
          "Address",
          "Orders",
          "Credits Left",
          "Family Group",
        ].join(","),
        ...exportCustomers.map((customer) => {
          return [
            customer.name,
            customer.email,
            customer.address,
            customer.orders,
            customer.creditsLeft,
            customer.familyGroup || "-",
          ].join(",");
        }),
      ].join("\n");

      const blob = new Blob([csv], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `customers-${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to export customers CSV", error);
    }
  };

  return (
    <div className="space-y-3 w-full overflow-x-hidden">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex items-center gap-3 flex-1">
          <h1 className="text-xl md:text-2xl font-semibold text-dark-900 dark:text-white">
            Customers Management
          </h1>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex-1 md:flex-initial min-w-[200px]">
            <SearchBar value={searchQuery} onChange={setSearchQuery} />
          </div>
          <Button
            className="bg-primary-500 hover:bg-primary-600 text-white"
            onClick={() => setIsCreateModalOpen(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Customer
          </Button>
          <Button className="bg-primary-500 hover:bg-primary-600 text-white">
            <ShoppingCart className="h-4 w-4 mr-2" />
            Quickly Sell
          </Button>
          <Button
            variant="outline"
            onClick={handleExportCSV}
            className="border-primary-500 text-primary-500 hover:bg-primary-100 dark:hover:bg-primary-900/20 hover:text-primary-600 dark:hover:text-primary-400"
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Customers List Section */}
      <div className="bg-white dark:bg-dark-700 rounded-xl border border-dark-200 dark:border-dark-600 shadow-sm dark:shadow-dark-900/50 p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-dark-900 dark:text-white">
            Customers List
          </h2>
          <Button
            variant="outline"
            onClick={() => setIsFiltersOpen(true)}
            className="border-primary-500 text-primary-500 hover:bg-primary-100 dark:hover:bg-primary-900/20 hover:text-primary-600 dark:hover:text-primary-400"
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
          </div>
        ) : (
          <CustomersTable
            customers={customers}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onViewDetails={handleViewDetails}
          />
        )}

        {/* Pagination */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4 pt-3 border-t border-dark-200 dark:border-dark-600">
          <div className="flex items-center gap-2">
            <span className="text-xs text-dark-600 dark:text-dark-400">
              Records per page
            </span>
            <span className="text-xs text-dark-500 dark:text-dark-400">
              Total: {totalRecords}
            </span>
            <Select
              value={itemsPerPage.toString()}
              onValueChange={(value) => {
                setItemsPerPage(Number(value));
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-20 h-9 dark:border-dark-600 dark:bg-dark-700 dark:text-white">
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
              className="h-9 w-9 border-dark-200 dark:border-dark-600 disabled:opacity-50"
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="h-9 w-9 border-dark-200 dark:border-dark-600 disabled:opacity-50"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                return (
                  <Button
                    key={pageNum}
                    variant={currentPage === pageNum ? "default" : "outline"}
                    size="icon"
                    onClick={() => setCurrentPage(pageNum)}
                    className={`h-9 w-9 ${
                      currentPage === pageNum
                        ? "bg-primary-500 hover:bg-primary-600 text-white"
                        : "border-dark-200 dark:border-dark-600"
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
              className="h-9 w-9 border-dark-200 dark:border-dark-600 disabled:opacity-50"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              className="h-9 w-9 border-dark-200 dark:border-dark-600 disabled:opacity-50"
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-end text-sm text-[#545454] dark:text-dark-500 py-4">
        Copyright {new Date().getFullYear()} Water Shop. All Rights Reserved
      </div>

      {/* Modals */}
      <FiltersModal
        open={isFiltersOpen}
        onOpenChange={setIsFiltersOpen}
        filters={filters}
        onFiltersChange={setFilters}
        customerTypes={customerTypes}
        statuses={customerStatuses}
      />

      <CreateCustomerModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
        onSuccess={fetchCustomers}
      />

      <DeleteCustomerModal
        open={isDeleteModalOpen}
        onOpenChange={setIsDeleteModalOpen}
        customer={selectedCustomer}
        onConfirm={handleConfirmDelete}
      />

      <CustomerDetailsModal
        open={isDetailsModalOpen}
        onOpenChange={(open) => {
          setIsDetailsModalOpen(open);
          if (!open) {
            setSelectedCustomer(null);
          }
        }}
        customer={selectedCustomer}
      />
    </div>
  );
}
