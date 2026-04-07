"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Trash2, Loader2 } from "lucide-react";
import { Supplier } from "../types";
import api from "@/lib/api";

interface DeleteSupplierModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplier: Supplier | null;
  onSuccess: () => void;
}

export function DeleteSupplierModal({
  open,
  onOpenChange,
  supplier,
  onSuccess,
}: DeleteSupplierModalProps) {
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!supplier) return;
    setLoading(true);
    try {
      await api.delete(`/suppliers/${supplier.id}`);
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to delete supplier", error);
    } finally {
      setLoading(false);
    }
  };

  if (!supplier) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="items-center">
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mx-auto mb-4">
            <Trash2 className="h-8 w-8 text-red-500" />
          </div>
          <DialogTitle className="text-center">Delete Supplier?</DialogTitle>
          <DialogDescription className="text-center pt-2">
            Are you sure you want to delete{" "}
            <strong className="font-semibold">{supplier.name}</strong>? This
            action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-row justify-center gap-3 mt-6 w-full">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-[#0EA5E9] text-[#0EA5E9] hover:bg-[#0EA5E9]/10 px-8"
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={loading}
            className="bg-red-500 hover:bg-red-600 hover:text-white text-white px-8"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Delete
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
