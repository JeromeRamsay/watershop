"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CustomerFilters } from "../types";
import { Filter } from "lucide-react";

interface FiltersModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: CustomerFilters;
  onFiltersChange: (filters: CustomerFilters) => void;
  customerTypes: string[];
  statuses: string[];
}

export function FiltersModal({
  open,
  onOpenChange,
  filters,
  onFiltersChange,
  customerTypes,
  statuses,
}: FiltersModalProps) {
  const handleApply = () => {
    onOpenChange(false);
  };

  const handleClear = () => {
    onFiltersChange({ customerType: "All", status: "All" });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-dark-600 dark:text-white">Customer Type</label>
            <Select
              value={filters.customerType}
              onValueChange={(value) => onFiltersChange({ ...filters, customerType: value })}
            >
              <SelectTrigger className="h-12">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {customerTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-dark-600 dark:text-white">Status</label>
            <Select
              value={filters.status}
              onValueChange={(value) => onFiltersChange({ ...filters, status: value })}
            >
              <SelectTrigger className="h-12">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statuses.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClear}>
            Clear
          </Button>
          <Button onClick={handleApply}>Apply</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
