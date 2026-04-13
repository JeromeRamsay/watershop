"use client";

import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { OrderItem } from "../types";
import { InventoryItem } from "@/features/inventory/types";

interface Promotion {
  _id: string;
  name: string;
  description: string;
  inventoryItem: { _id: string } | null;
  discountType: "percent" | "fixed";
  discountValue: number;
  startDate: string;
  endDate: string;
  minQuantity: number;
  maxQuantity: number | null;
  isActive: boolean;
}

const matchesPromotionWindow = (promotion: Promotion, now: Date) => {
  if (!promotion.isActive) return false;
  if (new Date(promotion.startDate) > now || new Date(promotion.endDate) < now) {
    return false;
  }

  return true;
};

const promotionMatchesQuantity = (promotion: Promotion, quantity: number) => {
  if (quantity < promotion.minQuantity) return false;
  if (promotion.maxQuantity !== null && quantity > promotion.maxQuantity) {
    return false;
  }

  return true;
};

const getPromotionDiscountAmount = (
  promotion: Promotion | null,
  quantity: number,
  unitPrice: number,
) => {
  if (!promotion || quantity <= 0 || unitPrice <= 0) {
    return 0;
  }

  const baseTotal = quantity * unitPrice;
  if (promotion.discountType === "percent") {
    return baseTotal * (promotion.discountValue / 100);
  }

  return Math.min(baseTotal, promotion.discountValue);
};

const calculateLineTotal = (
  quantity: number,
  unitPrice: number,
  manualDiscountPercent: number,
  promotion: Promotion | null,
) => {
  const baseTotal = quantity * unitPrice;
  const manualDiscountAmount = baseTotal * (manualDiscountPercent / 100);
  const promotionDiscountAmount = getPromotionDiscountAmount(
    promotion,
    quantity,
    unitPrice,
  );

  return Math.max(0, baseTotal - manualDiscountAmount - promotionDiscountAmount);
};

interface AddProductModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: Omit<OrderItem, "id">) => void;
  products: InventoryItem[];
  promotions?: Promotion[];
}

export function AddProductModal({
  open,
  onOpenChange,
  onSave,
  products,
  promotions = [],
}: AddProductModalProps) {
  const [formData, setFormData] = useState({
    productId: "",
    productName: "",
    quantity: "1",
    unitPrice: "",
    totalPrice: "",
    discount: "",
    creditsUsed: false,
  });

  const currentPromo = useMemo(() => {
    if (!formData.productId || !promotions.length) return null;

    const now = new Date();
    return (
      promotions.find((promotion) => {
        if (promotion.inventoryItem?._id !== formData.productId) return false;
        return matchesPromotionWindow(promotion, now);
      }) ?? null
    );
  }, [formData.productId, promotions]);

  const quantity = Number(formData.quantity) || 0;
  const unitPrice = Number(formData.unitPrice) || 0;
  const manualDiscountPercent = Number(formData.discount) || 0;
  const qualifyingPromo =
    currentPromo && promotionMatchesQuantity(currentPromo, quantity)
      ? currentPromo
      : null;
  const totalPrice = calculateLineTotal(
    quantity,
    unitPrice,
    manualDiscountPercent,
    qualifyingPromo,
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    onSave({
      productName: formData.productName,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...(formData as any), // Passing extra productId
      quantity,
      unitPrice,
      totalPrice,
      creditsUsed: formData.creditsUsed,
    });
    // Reset form
    setFormData({
      productId: "",
      productName: "",
      quantity: "1",
      unitPrice: "",
      totalPrice: "",
      discount: "",
      creditsUsed: false,
    });
    onOpenChange(false);
  };

  const handleProductChange = (productId: string) => {
    const product = products.find((p) => p.id === productId);
    if (product) {
      const quantity = Number(formData.quantity || 0);
      const unitPrice = product.sellingPrice;
      const discount = Number(formData.discount || 0);
      const nextPromo =
        promotions.find((promotion) => {
          if (promotion.inventoryItem?._id !== product.id) return false;
          return matchesPromotionWindow(promotion, new Date());
        }) ?? null;
      const appliedPromotion =
        nextPromo && promotionMatchesQuantity(nextPromo, quantity)
          ? nextPromo
          : null;
      const totalPrice = calculateLineTotal(
        quantity,
        unitPrice,
        discount,
        appliedPromotion,
      );

      setFormData({
        ...formData,
        productId: product.id,
        productName: product.itemName,
        unitPrice: unitPrice.toString(),
        totalPrice: totalPrice.toFixed(2),
      });
    }
  };

  const handleQuantityChange = (value: string) => {
    const quantity = Number(value) || 0;
    const unitPrice = Number(formData.unitPrice || 0);
    const discount = Number(formData.discount || 0);
    const appliedPromotion =
      currentPromo && promotionMatchesQuantity(currentPromo, quantity)
        ? currentPromo
        : null;
    const totalPrice = calculateLineTotal(
      quantity,
      unitPrice,
      discount,
      appliedPromotion,
    );

    setFormData({
      ...formData,
      quantity: value,
      totalPrice: totalPrice.toFixed(2),
    });
  };

  const handleUnitPriceChange = (value: string) => {
    const quantity = Number(formData.quantity || 0);
    const unitPrice = Number(value) || 0;
    const discount = Number(formData.discount || 0);
    const totalPrice = calculateLineTotal(
      quantity,
      unitPrice,
      discount,
      qualifyingPromo,
    );

    setFormData({
      ...formData,
      unitPrice: value,
      totalPrice: totalPrice.toFixed(2),
    });
  };

  const handleDiscountChange = (value: string) => {
    const quantity = Number(formData.quantity || 0);
    const unitPrice = Number(formData.unitPrice || 0);
    const discount = Number(value) || 0;
    const totalPrice = calculateLineTotal(
      quantity,
      unitPrice,
      discount,
      qualifyingPromo,
    );

    setFormData({
      ...formData,
      discount: value,
      totalPrice: totalPrice.toFixed(2),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Product</DialogTitle>
          <DialogDescription>
            Select a product and specify the quantity.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="productList">Product List</Label>
              <Select
                value={formData.productId}
                onValueChange={handleProductChange}
              >
                <SelectTrigger className="h-12" id="productList">
                  <SelectValue placeholder="Please Select" />
                </SelectTrigger>
                <SelectContent>
                  {products.length === 0 ? (
                    <SelectItem value="none" disabled>
                      No products found
                    </SelectItem>
                  ) : (
                    products.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.itemName}{" "}
                        {product.sku ? `(${product.sku})` : ""} - $
                        {product.sellingPrice}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* UI-4: computed fields shown as labels, not inputs */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quantityInStock">Quantity in Stock</Label>
              <p id="quantityInStock" className="flex h-12 items-center rounded-md border border-input bg-dark-50 px-3 text-sm text-dark-700 dark:bg-dark-800 dark:text-dark-300 select-text">
                {formData.productId
                  ? products.find((p) => p.id === formData.productId)?.stock ?? "—"
                  : "—"}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="unitPrice">Unit Price</Label>
              <p id="unitPrice" className="flex h-12 items-center rounded-md border border-input bg-dark-50 px-3 text-sm text-dark-700 dark:bg-dark-800 dark:text-dark-300 select-text">
                {formData.unitPrice !== "" ? `$${Number(formData.unitPrice).toFixed(2)}` : "—"}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="quantity">Quantity</Label>
            <Input
              id="quantity"
              type="number"
              value={formData.quantity}
              onChange={(e) => handleQuantityChange(e.target.value)}
              placeholder="Please Enter"
              className="h-12"
              min="0"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="totalPrice">Total Price</Label>
              <p id="totalPrice" className="flex h-12 items-center rounded-md border border-input bg-dark-50 px-3 text-sm text-dark-700 dark:bg-dark-800 dark:text-dark-300 select-text">
                {formData.totalPrice !== "" ? `$${Number(formData.totalPrice).toFixed(2)}` : "—"}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="discount">Apply Discount</Label>
              <Input
                id="discount"
                type="number"
                value={formData.discount}
                onChange={(e) => handleDiscountChange(e.target.value)}
                placeholder="Please Enter"
                className="h-12"
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="creditsUsed"
              checked={formData.creditsUsed}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, creditsUsed: checked as boolean })
              }
            />
            <Label
              htmlFor="creditsUsed"
              className="font-normal cursor-pointer text-sm"
            >
              Credits Used
            </Label>
          </div>

          {currentPromo && (
            <div className="rounded-lg border border-yellow-300 bg-yellow-50 dark:bg-yellow-900/20 dark:border-yellow-700/50 px-4 py-3 space-y-0.5">
              <p className="text-sm font-semibold text-yellow-600 dark:text-yellow-400">Current Promotion!</p>
              <p className="text-sm text-dark-900 dark:text-white">{currentPromo.description || currentPromo.name}</p>
              <p className="text-xs text-dark-500 dark:text-dark-400">
                {currentPromo.discountType === "percent"
                  ? `${currentPromo.discountValue}% off`
                  : `$${currentPromo.discountValue.toFixed(2)} off`}
                {currentPromo.minQuantity > 1 ? ` (min qty: ${currentPromo.minQuantity})` : ""}
                {currentPromo.maxQuantity !== null ? ` (max qty: ${currentPromo.maxQuantity})` : ""}
              </p>
              <p className="text-xs text-dark-500 dark:text-dark-400">
                {qualifyingPromo
                  ? "Promotion will be applied to the item total before tax."
                  : "Adjust quantity to qualify for the current promotion."}
              </p>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-primary-500 text-primary-500 hover:bg-primary-100 hover:text-primary-600"
            >
              Cancel
            </Button>
            <Button type="submit">Add Product</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
