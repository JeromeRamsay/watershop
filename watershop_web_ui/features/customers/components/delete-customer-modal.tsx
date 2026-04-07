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
import { Customer } from "../types";

interface DeleteCustomerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: Customer | null;
  onConfirm: () => void;
}

export function DeleteCustomerModal({
  open,
  onOpenChange,
  customer,
  onConfirm,
}: DeleteCustomerModalProps) {
  const handleDelete = () => {
    onConfirm();
    onOpenChange(false);
  };

  if (!customer) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="items-center">
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/20 mx-auto mb-4">
            <Trash2 className="h-8 w-8 text-red-500" />
          </div>

          <DialogTitle className="text-center text-dark-900 dark:text-white">
            Delete Customer?
          </DialogTitle>

          <DialogDescription className="text-center pt-2 text-dark-600 dark:text-dark-400">
            This action cannot be undone. Are you sure you want to delete this
            customer?
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-row justify-center gap-6 mt-8 w-full">
          {/* Cancel (outline blue) */}
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="
              h-12 w-[190px]
              rounded-xl
              border-2 border-[#0EA5E9]
              bg-white
              text-[#0EA5E9]
              font-medium
              hover:bg-[#EAF7FF]
              hover:text-[#0EA5E9]
            "
          >
            Cancel
          </Button>

          {/* Delete (solid blue) */}
          <Button
            type="button"
            onClick={handleDelete}
            className="
              h-12 w-[190px]
              rounded-xl
              bg-[#159AD6]
              text-white
              font-medium
              hover:bg-[#1287BE]
            "
          >
            Delete
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
