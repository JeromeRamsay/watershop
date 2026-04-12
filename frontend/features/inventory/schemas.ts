import { z } from "zod";

const policySchema = z.object({
  description: z.string().optional(),
  periodYears: z.number().min(0, "Years must be 0 or greater").optional(),
  periodMonths: z.number().min(0, "Months must be 0 or greater").optional(),
});

export const inventoryItemSchema = z.object({
  itemName: z.string().min(1, "Item name is required"),
  category: z.string().min(1, "Category is required"),
  sku: z.string().min(1, "SKU is required"),
  stock: z.number().min(0, "Stock must be 0 or greater"),
  unitType: z.string().min(1, "Unit type is required"),
  purchasePrice: z.number().min(0, "Purchase price must be 0 or greater"),
  sellingPrice: z.number().min(0, "Selling price must be 0 or greater"),
  supplier: z.string().min(1, "Supplier is required"),
  description: z.string().optional(),
  warranty: policySchema.optional(),
  returnPolicy: policySchema.optional(),
});

export type InventoryItemFormData = z.infer<typeof inventoryItemSchema>;
