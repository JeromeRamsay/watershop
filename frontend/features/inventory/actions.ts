"use server";

import { inventoryItemSchema } from "./schemas";
import { revalidatePath } from "next/cache";

// TODO: Replace with actual database operations
// For now, these are placeholder Server Actions

export async function createInventoryItem(formData: FormData) {
  const data = Object.fromEntries(formData);
  
  // Convert string numbers to actual numbers
  const validated = inventoryItemSchema.safeParse({
    ...data,
    stock: Number(data.stock),
    purchasePrice: Number(data.purchasePrice),
    sellingPrice: Number(data.sellingPrice),
  });

  if (!validated.success) {
    return { success: false, errors: validated.error.flatten().fieldErrors };
  }

  // TODO: Save to database
  // await db.inventory.create({ data: validated.data });

  revalidatePath("/dashboard/inventory");
  return { success: true };
}

export async function updateInventoryItem(id: string, formData: FormData) {
  const data = Object.fromEntries(formData);
  
  const validated = inventoryItemSchema.safeParse({
    ...data,
    stock: Number(data.stock),
    purchasePrice: Number(data.purchasePrice),
    sellingPrice: Number(data.sellingPrice),
  });

  if (!validated.success) {
    return { success: false, errors: validated.error.flatten().fieldErrors };
  }

  // TODO: Update in database
  // await db.inventory.update({ where: { id }, data: validated.data });

  revalidatePath("/dashboard/inventory");
  return { success: true };
}

export async function deleteInventoryItem(id: string) {
  // TODO: Delete from database
  // await db.inventory.delete({ where: { id } });

  revalidatePath("/dashboard/inventory");
  return { success: true };
}
