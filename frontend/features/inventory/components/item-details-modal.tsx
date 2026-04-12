"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { Loader2 } from "lucide-react";
import { InventoryItem, PolicyDetails } from "../types";
import { Supplier } from "@/features/suppliers/types";
import api from "@/lib/api";

interface ItemDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: InventoryItem | null;
  loading: boolean;
  categories: string[];
  suppliers: Supplier[];
  onSuccess: () => void;
  onItemUpdated: (item: InventoryItem) => void;
}

const formatCurrency = (value?: number) => {
  if (typeof value !== "number") return "-";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(value);
};

const formatDate = (value?: string) => {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatPolicyDuration = (policy?: PolicyDetails) => {
  if (!policy) return "-";
  const parts: string[] = [];
  if (policy.periodYears) parts.push(`${policy.periodYears} year${policy.periodYears === 1 ? "" : "s"}`);
  if (policy.periodMonths) parts.push(`${policy.periodMonths} month${policy.periodMonths === 1 ? "" : "s"}`);
  return parts.length > 0 ? parts.join(" ") : "-";
};

const buildPolicyPayload = (
  description: string,
  periodYears: string,
  periodMonths: string,
) => {
  const trimmedDescription = description.trim();
  if (!trimmedDescription && !periodYears && !periodMonths) {
    return undefined;
  }

  return {
    ...(trimmedDescription ? { description: trimmedDescription } : {}),
    periodYears: Number(periodYears || 0),
    periodMonths: Number(periodMonths || 0),
  };
};

const rowClassName = "grid grid-cols-1 gap-1 md:grid-cols-2 md:gap-3 text-sm";
const unitTypes = [
  { value: "piece", label: "Piece" },
  { value: "case", label: "Case" },
  { value: "kg", label: "Kg" },
  { value: "refill", label: "Refill" },
];

export function ItemDetailsModal({
  open,
  onOpenChange,
  item,
  loading,
  categories,
  suppliers,
  onSuccess,
  onItemUpdated,
}: ItemDetailsModalProps) {
  const [isEditMode, setIsEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    itemName: "",
    category: "",
    sku: "",
    stock: "",
    unitType: "",
    lowStockThreshold: "10",
    purchasePrice: "",
    sellingPrice: "",
    supplier: "",
    description: "",
    warrantyDescription: "",
    warrantyPeriodYears: "",
    warrantyPeriodMonths: "",
    returnPolicyDescription: "",
    returnPolicyPeriodYears: "",
    returnPolicyPeriodMonths: "",
    isTaxable: "true",
    isRefillable: "false",
    refillPrice: "0",
    rentalPrice: "0",
    isActive: "true",
  });

  const categoryOptions = useMemo(() => {
    return categories.filter((category) => category !== "All");
  }, [categories]);

  useEffect(() => {
    if (!item || !open) return;
    setIsEditMode(false);
    setFormData({
      itemName: item.itemName || "",
      category: categories.includes(item.category) ? item.category : "Unknown",
      sku: item.sku || "",
      stock: item.stock.toString(),
      unitType: item.unitType || "",
      lowStockThreshold: String(item.lowStockThreshold ?? 10),
      purchasePrice: String(item.purchasePrice ?? 0),
      sellingPrice: String(item.sellingPrice ?? 0),
      supplier: item.supplier || "",
      description: item.description || "",
      warrantyDescription: item.warranty?.description || "",
      warrantyPeriodYears: String(item.warranty?.periodYears ?? 0),
      warrantyPeriodMonths: String(item.warranty?.periodMonths ?? 0),
      returnPolicyDescription: item.returnPolicy?.description || "",
      returnPolicyPeriodYears: String(item.returnPolicy?.periodYears ?? 0),
      returnPolicyPeriodMonths: String(item.returnPolicy?.periodMonths ?? 0),
      isTaxable: String(item.isTaxable ?? true),
      isRefillable: String(item.isRefillable ?? false),
      refillPrice: String(item.refillPrice ?? 0),
      rentalPrice: String(item.rentalPrice ?? 0),
      isActive: String(item.isActive ?? true),
    });
  }, [categories, item, open]);

  const handleSave = async () => {
    if (!item) return;

    try {
      setSaving(true);
      const payload = {
        name: formData.itemName,
        sku: formData.sku,
        category: formData.category,
        description: formData.description,
        warranty: buildPolicyPayload(
          formData.warrantyDescription,
          formData.warrantyPeriodYears,
          formData.warrantyPeriodMonths,
        ),
        returnPolicy: buildPolicyPayload(
          formData.returnPolicyDescription,
          formData.returnPolicyPeriodYears,
          formData.returnPolicyPeriodMonths,
        ),
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

      const { data } = await api.patch(`/inventory/${item.id}`, payload);

      const stockValue = data.stockQuantity ?? Number(formData.stock);
      const thresholdValue =
        data.lowStockThreshold ?? Number(formData.lowStockThreshold);

      const updatedItem: InventoryItem = {
        id: data._id || data.id || item.id,
        sku: data.sku || formData.sku,
        itemName: data.name || formData.itemName,
        category: data.category || formData.category,
        stock: stockValue,
        lastUpdated: new Date(
          data.updatedAt || data.createdAt || Date.now(),
        ).toLocaleDateString("en-GB"),
        status:
          stockValue > thresholdValue
            ? "In Stock"
            : stockValue > 0
              ? "Low Stock"
              : "Out Stock",
        unitType: data.unitType || formData.unitType,
        purchasePrice: data.purchasePrice ?? Number(formData.purchasePrice),
        sellingPrice: data.sellingPrice ?? Number(formData.sellingPrice),
        supplier: data.supplier || formData.supplier,
        description: data.description ?? formData.description,
        warranty:
          data.warranty ??
          buildPolicyPayload(
            formData.warrantyDescription,
            formData.warrantyPeriodYears,
            formData.warrantyPeriodMonths,
          ),
        returnPolicy:
          data.returnPolicy ??
          buildPolicyPayload(
            formData.returnPolicyDescription,
            formData.returnPolicyPeriodYears,
            formData.returnPolicyPeriodMonths,
          ),
        lowStockThreshold: thresholdValue,
        isTaxable: data.isTaxable ?? formData.isTaxable === "true",
        isRefillable: data.isRefillable ?? formData.isRefillable === "true",
        refillPrice: data.refillPrice ?? Number(formData.refillPrice),
        rentalPrice: data.rentalPrice ?? Number(formData.rentalPrice),
        isActive: data.isActive ?? formData.isActive === "true",
        createdAt: data.createdAt ?? item.createdAt,
        updatedAt: data.updatedAt ?? item.updatedAt,
      };

      onItemUpdated(updatedItem);
      onSuccess();
      setIsEditMode(false);
      if (!updatedItem.isActive) {
        onOpenChange(false);
      }
    } catch (error) {
      console.error("Failed to update inventory item", error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader className="flex flex-row items-center justify-between gap-2">
          <DialogTitle>Product Details</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-[#0EA5E9]" />
          </div>
        ) : !item ? (
          <p className="text-sm text-[#6B7280]">No product details found.</p>
        ) : isEditMode ? (
          <div className="space-y-4">
            <div className={rowClassName}>
              <div className="space-y-1">
                <Label htmlFor="details-itemName">Item Name</Label>
                <Input
                  id="details-itemName"
                  value={formData.itemName}
                  onChange={(event) =>
                    setFormData((prev) => ({
                      ...prev,
                      itemName: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="details-sku">SKU / Item Code</Label>
                <Input
                  id="details-sku"
                  value={formData.sku}
                  onChange={(event) =>
                    setFormData((prev) => ({
                      ...prev,
                      sku: event.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <div className={rowClassName}>
              <div className="space-y-1">
                <Label htmlFor="details-category">Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, category: value }))
                  }
                >
                  <SelectTrigger id="details-category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categoryOptions.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="details-unitType">Unit Type</Label>
                <Select
                  value={formData.unitType}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, unitType: value }))
                  }
                >
                  <SelectTrigger id="details-unitType">
                    <SelectValue placeholder="Select unit type" />
                  </SelectTrigger>
                  <SelectContent>
                    {unitTypes.map((unitType) => (
                      <SelectItem key={unitType.value} value={unitType.value}>
                        {unitType.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className={rowClassName}>
              <div className="space-y-1">
                <Label htmlFor="details-stock">Stock Quantity</Label>
                <Input
                  id="details-stock"
                  type="number"
                  min="0"
                  value={formData.stock}
                  onChange={(event) =>
                    setFormData((prev) => ({
                      ...prev,
                      stock: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="details-lowStockThreshold">
                  Low Stock Threshold
                </Label>
                <Input
                  id="details-lowStockThreshold"
                  type="number"
                  min="0"
                  value={formData.lowStockThreshold}
                  onChange={(event) =>
                    setFormData((prev) => ({
                      ...prev,
                      lowStockThreshold: event.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <div className={rowClassName}>
              <div className="space-y-1">
                <Label htmlFor="details-purchasePrice">Purchase Price</Label>
                <Input
                  id="details-purchasePrice"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.purchasePrice}
                  onChange={(event) =>
                    setFormData((prev) => ({
                      ...prev,
                      purchasePrice: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="details-sellingPrice">Selling Price</Label>
                <Input
                  id="details-sellingPrice"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.sellingPrice}
                  onChange={(event) =>
                    setFormData((prev) => ({
                      ...prev,
                      sellingPrice: event.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <div className={rowClassName}>
              <div className="space-y-1">
                <Label htmlFor="details-refillPrice">Refill Price</Label>
                <Input
                  id="details-refillPrice"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.refillPrice}
                  onChange={(event) =>
                    setFormData((prev) => ({
                      ...prev,
                      refillPrice: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="details-rentalPrice">Rental Price</Label>
                <Input
                  id="details-rentalPrice"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.rentalPrice}
                  onChange={(event) =>
                    setFormData((prev) => ({
                      ...prev,
                      rentalPrice: event.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <div className={rowClassName}>
              <div className="space-y-1">
                <Label htmlFor="details-supplier">Supplier</Label>
                <Select
                  value={formData.supplier}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, supplier: value }))
                  }
                >
                  <SelectTrigger id="details-supplier">
                    <SelectValue placeholder="Select supplier" />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map((supplier) => (
                      <SelectItem key={supplier.id} value={supplier.name}>
                        {supplier.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="details-taxable">Taxable</Label>
                <Select
                  value={formData.isTaxable}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, isTaxable: value }))
                  }
                >
                  <SelectTrigger id="details-taxable">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Yes</SelectItem>
                    <SelectItem value="false">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className={rowClassName}>
              <div className="space-y-1">
                <Label htmlFor="details-refillable">Refillable</Label>
                <Select
                  value={formData.isRefillable}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, isRefillable: value }))
                  }
                >
                  <SelectTrigger id="details-refillable">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Yes</SelectItem>
                    <SelectItem value="false">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="details-active">Active</Label>
                <Select
                  value={formData.isActive}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, isActive: value }))
                  }
                >
                  <SelectTrigger id="details-active">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Yes</SelectItem>
                    <SelectItem value="false">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="details-description">Description</Label>
              <Textarea
                id="details-description"
                value={formData.description}
                onChange={(event) =>
                  setFormData((prev) => ({
                    ...prev,
                    description: event.target.value,
                  }))
                }
              />
            </div>

            <div className={rowClassName}>
              <div className="space-y-1">
                <Label htmlFor="details-warrantyDescription">Warranty Description</Label>
                <Textarea
                  id="details-warrantyDescription"
                  value={formData.warrantyDescription}
                  onChange={(event) =>
                    setFormData((prev) => ({
                      ...prev,
                      warrantyDescription: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="details-warrantyYears">Warranty Years</Label>
                  <Input
                    id="details-warrantyYears"
                    type="number"
                    min="0"
                    value={formData.warrantyPeriodYears}
                    onChange={(event) =>
                      setFormData((prev) => ({
                        ...prev,
                        warrantyPeriodYears: event.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="details-warrantyMonths">Warranty Months</Label>
                  <Input
                    id="details-warrantyMonths"
                    type="number"
                    min="0"
                    value={formData.warrantyPeriodMonths}
                    onChange={(event) =>
                      setFormData((prev) => ({
                        ...prev,
                        warrantyPeriodMonths: event.target.value,
                      }))
                    }
                  />
                </div>
              </div>
            </div>

            <div className={rowClassName}>
              <div className="space-y-1">
                <Label htmlFor="details-returnPolicyDescription">Return Policy Description</Label>
                <Textarea
                  id="details-returnPolicyDescription"
                  value={formData.returnPolicyDescription}
                  onChange={(event) =>
                    setFormData((prev) => ({
                      ...prev,
                      returnPolicyDescription: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="details-returnPolicyYears">Return Policy Years</Label>
                  <Input
                    id="details-returnPolicyYears"
                    type="number"
                    min="0"
                    value={formData.returnPolicyPeriodYears}
                    onChange={(event) =>
                      setFormData((prev) => ({
                        ...prev,
                        returnPolicyPeriodYears: event.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="details-returnPolicyMonths">Return Policy Months</Label>
                  <Input
                    id="details-returnPolicyMonths"
                    type="number"
                    min="0"
                    value={formData.returnPolicyPeriodMonths}
                    onChange={(event) =>
                      setFormData((prev) => ({
                        ...prev,
                        returnPolicyPeriodMonths: event.target.value,
                      }))
                    }
                  />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className={rowClassName}>
              <div>
                <p className="text-[#6B7280]">Item Name</p>
                <p className="font-medium text-[#111827]">{item.itemName}</p>
              </div>
              <div>
                <p className="text-[#6B7280]">SKU / Item Code</p>
                <p className="font-medium text-[#111827]">{item.sku}</p>
              </div>
            </div>

            <div className={rowClassName}>
              <div>
                <p className="text-[#6B7280]">Category</p>
                <p className="font-medium text-[#111827]">{item.category}</p>
              </div>
              <div>
                <p className="text-[#6B7280]">Status</p>
                <p className="font-medium text-[#111827]">{item.status}</p>
              </div>
            </div>

            <div className={rowClassName}>
              <div>
                <p className="text-[#6B7280]">Stock Quantity</p>
                <p className="font-medium text-[#111827]">{item.stock}</p>
              </div>
              <div>
                <p className="text-[#6B7280]">Low Stock Threshold</p>
                <p className="font-medium text-[#111827]">
                  {item.lowStockThreshold ?? "-"}
                </p>
              </div>
            </div>

            <div className={rowClassName}>
              <div>
                <p className="text-[#6B7280]">Unit Type</p>
                <p className="font-medium text-[#111827]">{item.unitType}</p>
              </div>
              <div>
                <p className="text-[#6B7280]">Supplier</p>
                <p className="font-medium text-[#111827]">
                  {item.supplier || "-"}
                </p>
              </div>
            </div>

            <div className={rowClassName}>
              <div>
                <p className="text-[#6B7280]">Purchase Price</p>
                <p className="font-medium text-[#111827]">
                  {formatCurrency(item.purchasePrice)}
                </p>
              </div>
              <div>
                <p className="text-[#6B7280]">Selling Price</p>
                <p className="font-medium text-[#111827]">
                  {formatCurrency(item.sellingPrice)}
                </p>
              </div>
            </div>

            <div className={rowClassName}>
              <div>
                <p className="text-[#6B7280]">Refillable</p>
                <p className="font-medium text-[#111827]">
                  {item.isRefillable ? "Yes" : "No"}
                </p>
              </div>
              <div>
                <p className="text-[#6B7280]">Refill Price</p>
                <p className="font-medium text-[#111827]">
                  {formatCurrency(item.refillPrice)}
                </p>
              </div>
            </div>

            <div className={rowClassName}>
              <div>
                <p className="text-[#6B7280]">Rental Price</p>
                <p className="font-medium text-[#111827]">
                  {formatCurrency(item.rentalPrice)}
                </p>
              </div>
              <div>
                <p className="text-[#6B7280]">Taxable</p>
                <p className="font-medium text-[#111827]">
                  {item.isTaxable ? "Yes" : "No"}
                </p>
              </div>
            </div>

            <div className={rowClassName}>
              <div>
                <p className="text-[#6B7280]">Created At</p>
                <p className="font-medium text-[#111827]">
                  {formatDate(item.createdAt)}
                </p>
              </div>
              <div>
                <p className="text-[#6B7280]">Last Updated</p>
                <p className="font-medium text-[#111827]">
                  {item.updatedAt
                    ? formatDate(item.updatedAt)
                    : item.lastUpdated}
                </p>
              </div>
            </div>

            <div>
              <p className="text-[#6B7280]">Description</p>
              <p className="font-medium text-[#111827]">
                {item.description || "-"}
              </p>
            </div>

            <div className={rowClassName}>
              <div>
                <p className="text-[#6B7280]">Warranty</p>
                <p className="font-medium text-[#111827] whitespace-pre-wrap">
                  {item.warranty?.description || "-"}
                </p>
                <p className="text-xs text-[#6B7280]">
                  Duration: {formatPolicyDuration(item.warranty)}
                </p>
              </div>
              <div>
                <p className="text-[#6B7280]">Return Policy</p>
                <p className="font-medium text-[#111827] whitespace-pre-wrap">
                  {item.returnPolicy?.description || "-"}
                </p>
                <p className="text-xs text-[#6B7280]">
                  Duration: {formatPolicyDuration(item.returnPolicy)}
                </p>
              </div>
            </div>
          </div>
        )}

        {!loading && item && (
          <div className="flex justify-end gap-2 border-t border-dark-100 pt-4 dark:border-dark-700">
            {isEditMode ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditMode(false)}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button type="button" onClick={handleSave} disabled={saving}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Changes
                </Button>
              </>
            ) : (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  Close
                </Button>
                <Button type="button" onClick={() => setIsEditMode(true)}>
                  Edit Item
                </Button>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
