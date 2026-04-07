"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DeliveryFilters } from "../types";
import { Calendar } from "lucide-react";

interface FiltersModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: DeliveryFilters;
  onFiltersChange: (filters: DeliveryFilters) => void;
  orderStatuses: readonly string[];
  deliveryTypes: readonly string[];
}

export function FiltersModal({
  open,
  onOpenChange,
  filters,
  onFiltersChange,
  orderStatuses,
  deliveryTypes,
}: FiltersModalProps) {
  const handleApply = () => {
    onOpenChange(false);
  };

  const handleClear = () => {
    onFiltersChange({
      orderStatus: "All",
      deliveryType: "All",
      dateRange: undefined,
    });
  };

  const formatDateRange = () => {
    if (filters.dateRange) {
      return `${filters.dateRange.from} - ${filters.dateRange.to}`;
    }
    return "";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Filters</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="orderStatus">Order Status</Label>
            <Select
              value={filters.orderStatus}
              onValueChange={(value) =>
                onFiltersChange({ ...filters, orderStatus: value })
              }
            >
              <SelectTrigger className="h-12" id="orderStatus">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All</SelectItem>
                {orderStatuses.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="deliveryType">Delivery Type</Label>
            <Select
              value={filters.deliveryType}
              onValueChange={(value) =>
                onFiltersChange({ ...filters, deliveryType: value })
              }
            >
              <SelectTrigger className="h-12" id="deliveryType">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All</SelectItem>
                {deliveryTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="dateRange">Date Range</Label>
            <div className="relative">
              <Input
                id="dateRange"
                type="text"
                placeholder="12/02/25 - 12/04/25"
                value={formatDateRange()}
                className="h-12 pr-10"
                readOnly
              />
              <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-dark-400 pointer-events-none" />
            </div>
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={handleClear}
            className="border-primary-500 text-primary-500 hover:bg-primary-100 hover:text-primary-600"
          >
            Clear
          </Button>
          <Button onClick={handleApply}>Apply</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
