"use client";

import { useEffect, useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { InventoryItem } from "../types";
// Backend expects: 'piece', 'case', 'kg', 'refill'
const unitTypes = [
  { value: "piece", label: "Piece" },
  { value: "case", label: "Case" },
  { value: "kg", label: "Kg" },
  { value: "refill", label: "Refill" },
];
import api from "@/lib/api";
import { Loader2 } from "lucide-react";
import { Supplier } from "@/features/suppliers/types";

interface EditItemModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: InventoryItem | null;
  onSuccess: () => void;
  categories: string[];
  suppliers: Supplier[];
}

export function EditItemModal({
  open,
  onOpenChange,
  item,
  onSuccess,
  categories,
  suppliers,
}: EditItemModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    itemName: "",
    category: "",
    sku: "",
    stock: "",
    unitType: "",
    lowStockThreshold: "",
    purchasePrice: "",
    sellingPrice: "",
    supplier: "",
    description: "",
    isTaxable: "true",
    isRefillable: "false",
    refillPrice: "",
    rentalPrice: "",
    isActive: "true",
  });

  useEffect(() => {
    if (item) {
      setFormData({
        itemName: item.itemName,
        category: categories.includes(item.category) ? item.category : "Unknown",
        sku: item.sku,
        stock: item.stock.toString(),
        unitType: item.unitType,
        lowStockThreshold: String(item.lowStockThreshold ?? 10),
        purchasePrice: item.purchasePrice.toFixed(2),
        sellingPrice: item.sellingPrice.toFixed(2),
        supplier: item.supplier,
        description: item.description,
        isTaxable: String(item.isTaxable ?? true),
        isRefillable: String(item.isRefillable ?? false),
        refillPrice: (item.refillPrice ?? 0).toFixed(2),
        rentalPrice: (item.rentalPrice ?? 0).toFixed(2),
        isActive: String(item.isActive ?? true),
      });
    }
  }, [item]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!item) return;

    setLoading(true);

    try {
      const payload = {
        name: formData.itemName,
        sku: formData.sku,
        category: formData.category,
        description: formData.description,
        stockQuantity: Number(formData.stock),
        unitType: formData.unitType,
        lowStockThreshold: Number(formData.lowStockThreshold),
        purchasePrice: Number(formData.purchasePrice),
        sellingPrice: Number(formData.sellingPrice),
        supplier: formData.supplier,
        isTaxable: formData.isTaxable === "true",
        isRefillable: formData.isRefillable === "true",
        refillPrice: Number(formData.refillPrice),
        rentalPrice: Number(formData.rentalPrice),
        isActive: formData.isActive === "true",
      };

      await api.patch(`/inventory/${item.id}`, payload);
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to update inventory item", error);
    } finally {
      setLoading(false);
    }
  };

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Inventory Item</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-itemName">Item Name</Label>
              <Input
                id="edit-itemName"
                value={formData.itemName}
                onChange={(e) =>
                  setFormData({ ...formData, itemName: e.target.value })
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-category">Category</Label>
              <Select
                value={formData.category}
                onValueChange={(value) =>
                  setFormData({ ...formData, category: value })
                }
              >
                <SelectTrigger className="h-12" id="edit-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories
                    .filter((cat) => cat !== "All")
                    .map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-sku">SKU/Item Code</Label>
              <Input
                id="edit-sku"
                value={formData.sku}
                onChange={(e) =>
                  setFormData({ ...formData, sku: e.target.value })
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-stock">Quantity in Stock</Label>
              <Input
                id="edit-stock"
                type="number"
                value={formData.stock}
                onChange={(e) =>
                  setFormData({ ...formData, stock: e.target.value })
                }
                required
                min="0"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-unitType">Unit Type</Label>
              <Select
                value={formData.unitType}
                onValueChange={(value) =>
                  setFormData({ ...formData, unitType: value })
                }
              >
                <SelectTrigger className="h-12" id="edit-unitType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {unitTypes.map((unit) => (
                    <SelectItem key={unit.value} value={unit.value}>
                      {unit.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-supplier">Supplier</Label>
              <Select
                value={formData.supplier}
                onValueChange={(value) =>
                  setFormData({ ...formData, supplier: value })
                }
              >
                <SelectTrigger className="h-12" id="edit-supplier">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((supplier) => (
                    <SelectItem key={supplier.id} value={supplier.name}>
                      {supplier.name}
                    </SelectItem>
                  ))}
                  {suppliers.length === 0 && (
                    <SelectItem value="none" disabled>
                      No suppliers found
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-purchasePrice">Purchase Price</Label>
              <Input
                id="edit-purchasePrice"
                type="number"
                step="0.01"
                value={formData.purchasePrice}
                onChange={(e) =>
                  setFormData({ ...formData, purchasePrice: e.target.value })
                }
                required
                min="0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-lowStockThreshold">Low Stock Threshold</Label>
              <Input
                id="edit-lowStockThreshold"
                type="number"
                value={formData.lowStockThreshold}
                onChange={(e) =>
                  setFormData({ ...formData, lowStockThreshold: e.target.value })
                }
                required
                min="0"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-isTaxable">Taxable</Label>
              <Select
                value={formData.isTaxable}
                onValueChange={(value) =>
                  setFormData({ ...formData, isTaxable: value })
                }
              >
                <SelectTrigger className="h-12" id="edit-isTaxable">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Yes</SelectItem>
                  <SelectItem value="false">No</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-isActive">Active</Label>
              <Select
                value={formData.isActive}
                onValueChange={(value) =>
                  setFormData({ ...formData, isActive: value })
                }
              >
                <SelectTrigger className="h-12" id="edit-isActive">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Yes</SelectItem>
                  <SelectItem value="false">No</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Refillable</Label>
            <RadioGroup
              value={formData.isRefillable}
              onValueChange={(value) =>
                setFormData({ ...formData, isRefillable: value })
              }
              className="flex flex-row items-center gap-6"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="true" id="edit-refill-yes" />
                <Label htmlFor="edit-refill-yes" className="font-normal text-sm">
                  Yes
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="false" id="edit-refill-no" />
                <Label htmlFor="edit-refill-no" className="font-normal text-sm">
                  No
                </Label>
              </div>
            </RadioGroup>
          </div>

          {formData.isRefillable === "true" && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-refillPrice">Refill Price</Label>
                <Input
                  id="edit-refillPrice"
                  type="number"
                  step="0.01"
                  value={formData.refillPrice}
                  onChange={(e) =>
                    setFormData({ ...formData, refillPrice: e.target.value })
                  }
                  min="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-rentalPrice">Rental Price/Deposit</Label>
                <Input
                  id="edit-rentalPrice"
                  type="number"
                  step="0.01"
                  value={formData.rentalPrice}
                  onChange={(e) =>
                    setFormData({ ...formData, rentalPrice: e.target.value })
                  }
                  min="0"
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-sellingPrice">Selling Price</Label>
              <Input
                id="edit-sellingPrice"
                type="number"
                step="0.01"
                value={formData.sellingPrice}
                onChange={(e) =>
                  setFormData({ ...formData, sellingPrice: e.target.value })
                }
                required
                min="0"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-description">Description</Label>
            <Textarea
              id="edit-description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              className="min-h-24"
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-[#0EA5E9] text-[#0EA5E9] hover:bg-[#0EA5E9]/10"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-[#0EA5E9] hover:bg-[#0284C7] text-white"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update Item
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
