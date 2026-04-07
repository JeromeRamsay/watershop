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
import { Delivery } from "../types";
import { useState, useMemo } from "react";

interface EditDeliveryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  delivery: Delivery | null;
  onUpdate: (delivery: Delivery) => void;
}

export function EditDeliveryModal({
  open,
  onOpenChange,
  delivery,
  onUpdate,
}: EditDeliveryModalProps) {
  // Use useMemo to derive form data from delivery - key prop on Dialog ensures remount on delivery.id change
  const formData = useMemo(() => {
    return delivery ? { ...delivery } : null;
  }, [delivery]);

  // Use local state for form inputs - key prop on Dialog ensures fresh state on delivery.id change
  // Initialize with formData values (key prop ensures remount when delivery.id changes)
  const [customer, setCustomer] = useState(formData?.customer || "");
  const [address, setAddress] = useState(formData?.address || "");
  const [dateTime, setDateTime] = useState(formData?.dateTime || "");
  const [status, setStatus] = useState<Delivery["status"]>(formData?.status || "Pending");

  if (!delivery || !formData) return null;

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData) {
      onUpdate({
        ...formData,
        customer,
        address,
        dateTime,
        status,
      });
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} key={delivery.id}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Delivery</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleFormSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="customer">Customer</Label>
              <Input
                id="customer"
                value={customer}
                onChange={(e) => setCustomer(e.target.value)}
                className="h-12"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="h-12"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dateTime">Date & Time</Label>
              <Input
                id="dateTime"
                value={dateTime}
                onChange={(e) => setDateTime(e.target.value)}
                placeholder="12/03/24 11:20"
                className="h-12"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={status}
                onValueChange={(value) => setStatus(value as Delivery["status"])}
              >
                <SelectTrigger className="h-12" id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Confirmed">Confirmed</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Scheduled">Scheduled</SelectItem>
                  <SelectItem value="Cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-primary-500 text-primary-500 hover:bg-primary-100 hover:text-primary-600"
            >
              Cancel
            </Button>
            <Button type="submit">Save Changes</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
