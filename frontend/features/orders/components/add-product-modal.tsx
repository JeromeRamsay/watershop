"use client";

import { useState } from "react";
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

interface AddProductModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: Omit<OrderItem, "id">) => void;
  products: InventoryItem[];
}

export function AddProductModal({
  open,
  onOpenChange,
  onSave,
  products,
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const quantity = Number(formData.quantity);
    const unitPrice = Number(formData.unitPrice);
    const discount = Number(formData.discount) || 0;
    const totalPrice = quantity * unitPrice * (1 - discount / 100);

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
      const totalPrice = quantity * unitPrice * (1 - discount / 100);

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
    const totalPrice = quantity * unitPrice * (1 - discount / 100);

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
    const totalPrice = quantity * unitPrice * (1 - discount / 100);

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
    const totalPrice = quantity * unitPrice * (1 - discount / 100);

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
