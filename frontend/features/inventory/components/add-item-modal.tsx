"use client";

import { useState } from "react";
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
import { SupplierSelect } from "./supplier-select";
import { inventoryItemSchema } from "@/lib/schemas";

interface AddItemModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  categories: string[];
  suppliers: Supplier[];
}

export function AddItemModal({
  open,
  onOpenChange,
  onSuccess,
  categories,
  suppliers,
}: AddItemModalProps) {
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState({
    itemName: "",
    category: "",
    sku: `#A${Math.floor(Math.random() * 1000000)}`,
    stock: "",
    unitType: "",
    purchasePrice: "",
    sellingPrice: "",
    supplier: "Unknown",
    description: "",
    warrantyDescription: "",
    warrantyPeriodYears: "",
    warrantyPeriodMonths: "",
    returnPolicyDescription: "",
    returnPolicyPeriodYears: "",
    returnPolicyPeriodMonths: "",
    isRefillable: "false",
    refillPrice: "",
    rentalPrice: "",
  });

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setFieldErrors({});

    // ── Zod validation ───────────────────────────────────────────────────
    const parsed = inventoryItemSchema.safeParse({
      itemName: formData.itemName,
      category: formData.category,
      sku: formData.sku,
      stock: formData.stock,
      unitType: formData.unitType,
      purchasePrice: formData.purchasePrice,
      sellingPrice: formData.sellingPrice,
      supplier: formData.supplier,
      description: formData.description,
      warranty: {
        description: formData.warrantyDescription || undefined,
        periodYears: formData.warrantyPeriodYears || undefined,
        periodMonths: formData.warrantyPeriodMonths || undefined,
      },
      returnPolicy: {
        description: formData.returnPolicyDescription || undefined,
        periodYears: formData.returnPolicyPeriodYears || undefined,
        periodMonths: formData.returnPolicyPeriodMonths || undefined,
      },
      refillPrice: formData.refillPrice || undefined,
      rentalPrice: formData.rentalPrice || undefined,
    });
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0]);
        errs[key] = issue.message;
      }
      setFieldErrors(errs);
      setLoading(false);
      return;
    }

    try {
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
        lowStockThreshold: 10, // Default value
        purchasePrice: Number(formData.purchasePrice),
        sellingPrice: Number(formData.sellingPrice),
        supplier: formData.supplier,
        isTaxable: true, // Default: taxable
        isActive: true,
        isRefillable: formData.isRefillable === "true",
        refillPrice: Number(formData.refillPrice),
        rentalPrice: Number(formData.rentalPrice),
      };

      await api.post("/inventory", payload);

      // Reset form
      setFormData({
        itemName: "",
        category: "",
        sku: `#A${Math.floor(Math.random() * 1000000)}`,
        stock: "",
        unitType: "",
        purchasePrice: "",
        sellingPrice: "",
        supplier: "Unknown",
        description: "",
        warrantyDescription: "",
        warrantyPeriodYears: "",
        warrantyPeriodMonths: "",
        returnPolicyDescription: "",
        returnPolicyPeriodYears: "",
        returnPolicyPeriodMonths: "",
        isRefillable: "false",
        refillPrice: "",
        rentalPrice: "",
      });
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to add inventory item", error);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Design-only tokens (no logic changes)
  const labelCls = "text-sm font-medium text-[#111827]";
  const fieldWrap = "space-y-2";
  const inputCls =
    "h-12 rounded-xl border border-[#E5E7EB] bg-white px-3 text-sm text-[#111827] " +
    "placeholder:text-[#9CA3AF] shadow-sm outline-none " +
    "focus:border-[#38BDF8] focus:ring-4 focus:ring-[#E0F2FE]";
  const selectTriggerCls =
    "h-12 rounded-xl border border-[#E5E7EB] bg-white px-3 text-sm text-[#111827] shadow-sm " +
    "focus:border-[#38BDF8] focus:ring-4 focus:ring-[#E0F2FE] data-[placeholder]:text-[#9CA3AF]";
  const selectContentCls =
    "rounded-xl border border-[#E5E7EB] bg-white shadow-[0_10px_30px_rgba(17,24,39,0.10)] p-1";
  const selectItemCls =
    "rounded-lg text-sm text-[#111827] focus:bg-[#EAF7FF] focus:text-[#0EA5E9] " +
    "data-[highlighted]:bg-[#EAF7FF] data-[highlighted]:text-[#0EA5E9]";
  const modalCls =
    "sm:max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-[#EEF2F7] " +
    "shadow-[0_20px_60px_rgba(17,24,39,0.18)]";
  const btnOutlineBlue =
    "h-11 rounded-xl border border-[#A7DCFF] bg-white text-[#0EA5E9] hover:bg-[#EAF7FF]";
  const btnPrimary =
    "h-11 rounded-xl bg-[#0EA5E9] text-white hover:bg-[#0284C7]";
  const textareaCls =
    "min-h-24 rounded-xl border border-[#E5E7EB] bg-white px-3 py-2 text-sm text-[#111827] " +
    "placeholder:text-[#9CA3AF] shadow-sm outline-none " +
    "focus:border-[#38BDF8] focus:ring-4 focus:ring-[#E0F2FE]";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={modalCls}>
        <DialogHeader className="pb-2">
          <DialogTitle className="text-lg font-semibold text-[#111827]">
            Add Inventory Item
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {Object.keys(fieldErrors).length > 0 && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              Please fix the errors below before saving.
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className={fieldWrap}>
              <Label className={labelCls} htmlFor="itemName">
                Item Name
              </Label>
              <Input
                id="itemName"
                className={inputCls}
                value={formData.itemName}
                onChange={(e) =>
                  setFormData({ ...formData, itemName: e.target.value })
                }
                placeholder="Please Enter"
                required
              />
              {fieldErrors.itemName && <p className="text-xs text-red-600">{fieldErrors.itemName}</p>}
            </div>

            <div className={fieldWrap}>
              <Label className={labelCls} htmlFor="category">
                Category
              </Label>
              <Select
                value={formData.category}
                onValueChange={(value) =>
                  setFormData({ ...formData, category: value })
                }
              >
                <SelectTrigger className={selectTriggerCls} id="category">
                  <SelectValue placeholder="Please Select" />
                </SelectTrigger>
                <SelectContent className={selectContentCls}>
                  {categories
                    .filter((cat) => cat !== "All")
                    .map((category) => (
                      <SelectItem
                        className={selectItemCls}
                        key={category}
                        value={category}
                      >
                        {category}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {fieldErrors.category && <p className="text-xs text-red-600">{fieldErrors.category}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className={fieldWrap}>
              <Label className={labelCls} htmlFor="sku">
                SKU/Item Code
              </Label>
              <Input
                id="sku"
                className={inputCls}
                value={formData.sku}
                onChange={(e) =>
                  setFormData({ ...formData, sku: e.target.value })
                }
                placeholder="Please Enter"
                required
              />
              {fieldErrors.sku && <p className="text-xs text-red-600">{fieldErrors.sku}</p>}
            </div>

            <div className={fieldWrap}>
              <Label className={labelCls} htmlFor="stock">
                Quantity in Stock
              </Label>
              <Input
                id="stock"
                className={inputCls}
                type="number"
                value={formData.stock}
                onChange={(e) =>
                  setFormData({ ...formData, stock: e.target.value })
                }
                placeholder="Please Enter"
                required
                min="0"
              />
              {fieldErrors.stock && <p className="text-xs text-red-600">{fieldErrors.stock}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className={fieldWrap}>
              <Label className={labelCls} htmlFor="unitType">
                Unit Type
              </Label>
              <Select
                value={formData.unitType}
                onValueChange={(value) =>
                  setFormData({ ...formData, unitType: value })
                }
              >
                <SelectTrigger className={selectTriggerCls} id="unitType">
                  <SelectValue placeholder="Please Select" />
                </SelectTrigger>
                <SelectContent className={selectContentCls}>
                  {unitTypes.map((unit) => (
                    <SelectItem
                      className={selectItemCls}
                      key={unit.value}
                      value={unit.value}
                    >
                      {unit.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fieldErrors.unitType && <p className="text-xs text-red-600">{fieldErrors.unitType}</p>}
            </div>

            <div className={fieldWrap}>
              <Label className={labelCls} htmlFor="supplier">
                Supplier
              </Label>
              {/* NOTE: No functional changes here. If SupplierSelect supports className props,
                  pass trigger/content styling to match. Otherwise it will still work.
              */}
              <div className="rounded-xl">
                <SupplierSelect
                  value={formData.supplier}
                  onChange={(value) =>
                    setFormData({ ...formData, supplier: value })
                  }
                  suppliers={suppliers}
                />
              </div>
              {fieldErrors.supplier && <p className="text-xs text-red-600">{fieldErrors.supplier}</p>}
            </div>
          </div>

          {formData.isRefillable === "true" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
              <div className={fieldWrap}>
                <Label className={labelCls} htmlFor="refillPrice">
                  Refill Price
                </Label>
                <Input
                  id="refillPrice"
                  className={inputCls}
                  type="number"
                  step="0.01"
                  value={formData.refillPrice}
                  onChange={(e) =>
                    setFormData({ ...formData, refillPrice: e.target.value })
                  }
                  placeholder="Please Enter"
                  min="0"
                />
                {fieldErrors.refillPrice && <p className="text-xs text-red-600">{fieldErrors.refillPrice}</p>}
              </div>

              <div className={fieldWrap}>
                <Label className={labelCls} htmlFor="rentalPrice">
                  Rental Price/Deposit
                </Label>
                <Input
                  id="rentalPrice"
                  className={inputCls}
                  type="number"
                  step="0.01"
                  value={formData.rentalPrice}
                  onChange={(e) =>
                    setFormData({ ...formData, rentalPrice: e.target.value })
                  }
                  placeholder="Please Enter"
                  min="0"
                />
                {fieldErrors.rentalPrice && <p className="text-xs text-red-600">{fieldErrors.rentalPrice}</p>}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className={fieldWrap}>
              <Label className={labelCls} htmlFor="purchasePrice">
                Purchase Price
              </Label>
              <Input
                id="purchasePrice"
                className={inputCls}
                type="number"
                step="0.01"
                value={formData.purchasePrice}
                onChange={(e) =>
                  setFormData({ ...formData, purchasePrice: e.target.value })
                }
                placeholder="Please Enter"
                required
                min="0"
              />
              {fieldErrors.purchasePrice && <p className="text-xs text-red-600">{fieldErrors.purchasePrice}</p>}
            </div>

            <div className={fieldWrap}>
              <Label className={labelCls} htmlFor="sellingPrice">
                Selling Price
              </Label>
              <Input
                id="sellingPrice"
                className={inputCls}
                type="number"
                step="0.01"
                value={formData.sellingPrice}
                onChange={(e) =>
                  setFormData({ ...formData, sellingPrice: e.target.value })
                }
                placeholder="Please Enter"
                required
                min="0"
              />
              {fieldErrors.sellingPrice && <p className="text-xs text-red-600">{fieldErrors.sellingPrice}</p>}
            </div>
          </div>
          <div className="space-y-3">
            <Label className={labelCls}>Refill</Label>
            <RadioGroup
              defaultValue="false"
              value={formData.isRefillable}
              onValueChange={(value) =>
                setFormData({ ...formData, isRefillable: value })
              }
              className="flex flex-row items-center gap-6"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="true" id="refill-yes" />
                <Label htmlFor="refill-yes" className="font-normal text-sm">
                  Yes
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="false" id="refill-no" />
                <Label htmlFor="refill-no" className="font-normal text-sm">
                  No
                </Label>
              </div>
            </RadioGroup>
          </div>
          <div className={fieldWrap}>
            <Label className={labelCls} htmlFor="description">
              Description
            </Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="Please Enter"
              className={textareaCls}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3 rounded-xl border border-[#E5E7EB] p-4">
              <div className={fieldWrap}>
                <Label className={labelCls} htmlFor="warrantyDescription">
                  Warranty Description
                </Label>
                <Textarea
                  id="warrantyDescription"
                  value={formData.warrantyDescription}
                  onChange={(e) =>
                    setFormData({ ...formData, warrantyDescription: e.target.value })
                  }
                  placeholder="Please Enter"
                  className={textareaCls}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className={fieldWrap}>
                  <Label className={labelCls} htmlFor="warrantyPeriodYears">
                    Warranty Years
                  </Label>
                  <Input
                    id="warrantyPeriodYears"
                    className={inputCls}
                    type="number"
                    min="0"
                    value={formData.warrantyPeriodYears}
                    onChange={(e) =>
                      setFormData({ ...formData, warrantyPeriodYears: e.target.value })
                    }
                    placeholder="0"
                  />
                </div>
                <div className={fieldWrap}>
                  <Label className={labelCls} htmlFor="warrantyPeriodMonths">
                    Warranty Months
                  </Label>
                  <Input
                    id="warrantyPeriodMonths"
                    className={inputCls}
                    type="number"
                    min="0"
                    value={formData.warrantyPeriodMonths}
                    onChange={(e) =>
                      setFormData({ ...formData, warrantyPeriodMonths: e.target.value })
                    }
                    placeholder="0"
                  />
                </div>
              </div>
              {fieldErrors.warranty && <p className="text-xs text-red-600">{fieldErrors.warranty}</p>}
            </div>

            <div className="space-y-3 rounded-xl border border-[#E5E7EB] p-4">
              <div className={fieldWrap}>
                <Label className={labelCls} htmlFor="returnPolicyDescription">
                  Return Policy Description
                </Label>
                <Textarea
                  id="returnPolicyDescription"
                  value={formData.returnPolicyDescription}
                  onChange={(e) =>
                    setFormData({ ...formData, returnPolicyDescription: e.target.value })
                  }
                  placeholder="Please Enter"
                  className={textareaCls}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className={fieldWrap}>
                  <Label className={labelCls} htmlFor="returnPolicyPeriodYears">
                    Return Policy Years
                  </Label>
                  <Input
                    id="returnPolicyPeriodYears"
                    className={inputCls}
                    type="number"
                    min="0"
                    value={formData.returnPolicyPeriodYears}
                    onChange={(e) =>
                      setFormData({ ...formData, returnPolicyPeriodYears: e.target.value })
                    }
                    placeholder="0"
                  />
                </div>
                <div className={fieldWrap}>
                  <Label className={labelCls} htmlFor="returnPolicyPeriodMonths">
                    Return Policy Months
                  </Label>
                  <Input
                    id="returnPolicyPeriodMonths"
                    className={inputCls}
                    type="number"
                    min="0"
                    value={formData.returnPolicyPeriodMonths}
                    onChange={(e) =>
                      setFormData({ ...formData, returnPolicyPeriodMonths: e.target.value })
                    }
                    placeholder="0"
                  />
                </div>
              </div>
              {fieldErrors.returnPolicy && <p className="text-xs text-red-600">{fieldErrors.returnPolicy}</p>}
            </div>
          </div>

          <DialogFooter className="pt-2 gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className={btnOutlineBlue}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className={btnPrimary}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Item
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
