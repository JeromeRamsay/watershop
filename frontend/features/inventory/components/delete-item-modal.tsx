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
import { InventoryItem } from "../types";
import api from "@/lib/api";

interface DeleteItemModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: InventoryItem | null;
  onSuccess: () => void;
}

export function DeleteItemModal({
  open,
  onOpenChange,
  item,
  onSuccess,
}: DeleteItemModalProps) {
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!item) return;
    setLoading(true);
    try {
      await api.delete(`/inventory/${item.id}`);
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to delete item", error);
    } finally {
      setLoading(false);
    }
  };

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="items-center">
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mx-auto mb-4">
            <Trash2 className="h-8 w-8 text-red-500" />
          </div>

          <DialogTitle className="text-center">
            Delete Inventory Item?
          </DialogTitle>

          <DialogDescription className="text-center pt-2">
            Are you sure you want to delete{" "}
            <strong className="font-semibold">{item.itemName}</strong>?
            <br />
            This action cannot be undone.
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
            disabled={loading}
            className="
              h-12 w-[190px]
              rounded-xl
              bg-[#159AD6]
              text-white
              font-medium
              hover:bg-[#1287BE]
              disabled:opacity-70
            "
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Delete
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
