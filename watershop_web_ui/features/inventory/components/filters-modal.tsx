"use client";

import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { InventoryFilters } from "../types";

interface FiltersModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: InventoryFilters;
  onFiltersChange: (filters: InventoryFilters) => void;
  categories: string[];
  statuses: string[];
}

export function FiltersModal({
  open,
  onOpenChange,
  filters,
  onFiltersChange,
  categories,
  statuses,
}: FiltersModalProps) {
  const handleApply = () => {
    onOpenChange(false);
  };

  const handleClear = () => {
    onFiltersChange({ category: "All", status: "All" });
  };

  console.log({ filters });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-dark-600 dark:text-white">
              Category
            </label>
            <Select
              value={filters.category}
              onValueChange={(value) =>
                onFiltersChange({ ...filters, category: value })
              }
            >
              <SelectTrigger className="h-12">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-dark-600 dark:text-white">
              Status
            </label>
            <Select
              value={filters.status}
              onValueChange={(value) =>
                onFiltersChange({ ...filters, status: value })
              }
            >
              <SelectTrigger className="h-12">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All</SelectItem>
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
