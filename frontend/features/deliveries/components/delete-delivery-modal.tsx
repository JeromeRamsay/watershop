"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { Delivery } from "../types";

interface DeleteDeliveryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  delivery: Delivery | null;
  onConfirm: () => void;
}

export function DeleteDeliveryModal({
  open,
  onOpenChange,
  delivery,
  onConfirm,
}: DeleteDeliveryModalProps) {
  const handleConfirm = () => {
    onConfirm();
    onOpenChange(false);
  };

  if (!delivery) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="items-center">
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mx-auto mb-4">
            <Trash2 className="h-8 w-8 text-red-500" />
          </div>
          <DialogTitle className="text-center">Delete Delivery?</DialogTitle>
          <DialogDescription className="text-center pt-2">
            Are you sure you want to delete the delivery for{" "}
            <strong className="font-semibold">{delivery.customer}</strong>? This action
            cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-row justify-center gap-3 mt-6 w-full">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-primary-500 text-primary-500 hover:bg-primary-100 hover:text-primary-600 px-8"
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            className="bg-red-500 hover:bg-red-600 hover:text-white text-white px-8"
          >
            Delete
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
