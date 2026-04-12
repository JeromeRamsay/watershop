/**
 * Centralised Zod schemas for every form in the app (UI-5).
 * Use these for both client-side validation (inline errors) and as a reference
 * for backend DTO decorators (class-validator).
 */
import { z } from "zod";

// ─── Reusable field rules ────────────────────────────────────────────────────

/** Letters, spaces, hyphens, apostrophes — 1–100 chars */
export const nameSchema = z
  .string()
  .min(1, "Name is required")
  .max(100, "Name must be at most 100 characters")
  .regex(/^[A-Za-z\s'\-]+$/, "Name may only contain letters, spaces, hyphens, and apostrophes");

/** North American (US/CA) and international long-distance phone numbers */
export const phoneSchema = z
  .string()
  .min(1, "Phone number is required")
  .max(25, "Phone number is too long")
  .refine((val) => {
    const trimmed = val.trim();
    // North American: optional +1 or 1 prefix, then (xxx) xxx-xxxx and common variants
    const northAm = /^(\+?1[\s.\-]?)?\(?\d{3}\)?[\s.\-]?\d{3}[\s.\-]?\d{4}$/;
    if (northAm.test(trimmed)) return true;
    // International long-distance: + followed by country code and subscriber number
    const stripped = trimmed.replace(/[\s.\-()]/g, "");
    return /^\+[1-9]\d{6,14}$/.test(stripped);
  }, "Enter a valid phone number (e.g. (416) 123-4567 or +44 20 1234 5678)");

/** Standard email */
export const emailSchema = z.string().email("Enter a valid email address");

/** Non-negative decimal, max 2 decimal places */
export const priceSchema = z
  .string()
  .refine((v) => v === "" || /^\d+(\.\d{1,2})?$/.test(v), {
    message: "Enter a valid price (e.g. 9.99)",
  });

/** Non-negative integer */
export const quantitySchema = z
  .string()
  .refine((v) => v === "" || /^\d+$/.test(v), {
    message: "Enter a whole number (e.g. 5)",
  });

/** Max 200 chars (address) */
export const addressSchema = z.string().max(200, "Address must be at most 200 characters");

/** Min 8 chars, at least one letter and one digit */
export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Za-z]/, "Password must contain at least one letter")
  .regex(/\d/, "Password must contain at least one digit");

/** Free text, max 500 chars */
export const notesSchema = z.string().max(500, "Notes must be at most 500 characters");

const policyPeriodSchema = quantitySchema.optional();

export const policyFormSchema = z.object({
  description: notesSchema.optional(),
  periodYears: policyPeriodSchema,
  periodMonths: policyPeriodSchema,
});

// ─── Customer form ────────────────────────────────────────────────────────────

export const createCustomerSchema = z.object({
  firstName: z
    .string()
    .min(1, "First name is required")
    .max(100, "First name must be at most 100 characters")
    .regex(/^[A-Za-z]+$/, "First name may only contain letters"),
  lastName: z
    .string()
    .min(1, "Last name is required")
    .max(100, "Last name must be at most 100 characters")
    .regex(/^[A-Za-z]+$/, "Last name may only contain letters"),
  email: emailSchema.or(z.literal("")),
  phone: phoneSchema,
  street: addressSchema.min(1, "Street is required"),
  city: z
    .string()
    .min(1, "City is required")
    .max(100, "City must be at most 100 characters")
    .regex(/^[A-Za-z]+$/, "City may only contain letters"),
  zipCode: z
    .string()
    .min(1, "Postal code is required")
    .regex(
      /^[A-Za-z]\d[A-Za-z] ?\d[A-Za-z]\d$/,
      "Enter a valid Canadian postal code (e.g. A1A 1A1)",
    ),
  notes: notesSchema.optional(),
});

export type CreateCustomerFormData = z.infer<typeof createCustomerSchema>;

// ─── Inventory form ───────────────────────────────────────────────────────────

export const inventoryItemSchema = z.object({
  itemName: z
    .string()
    .min(1, "Item name is required")
    .max(100, "Item name must be at most 100 characters"),
  category: z.string().min(1, "Category is required"),
  sku: z
    .string()
    .min(1, "SKU is required")
    .max(50, "SKU must be at most 50 characters"),
  stock: quantitySchema.refine((v) => v !== "", { message: "Stock quantity is required" }),
  unitType: z.string().min(1, "Unit type is required"),
  purchasePrice: priceSchema.refine((v) => v !== "", { message: "Purchase price is required" }),
  sellingPrice: priceSchema.refine((v) => v !== "", { message: "Selling price is required" }),
  supplier: z.string().min(1, "Supplier is required"),
  description: notesSchema.optional(),
  warranty: policyFormSchema.optional(),
  returnPolicy: policyFormSchema.optional(),
  refillPrice: priceSchema.optional(),
  rentalPrice: priceSchema.optional(),
});

export type InventoryItemFormData = z.infer<typeof inventoryItemSchema>;

// ─── Supplier form ────────────────────────────────────────────────────────────

export const supplierSchema = z.object({
  name: z
    .string()
    .min(1, "Supplier name is required")
    .max(100, "Supplier name must be at most 100 characters"),
  contactName: z.string().max(100).optional(),
  email: emailSchema.or(z.literal("")).optional(),
  phone: phoneSchema.or(z.literal("")).optional(),
  address: addressSchema.optional(),
  notes: notesSchema.optional(),
});

export type SupplierFormData = z.infer<typeof supplierSchema>;

// ─── Auth / User form ─────────────────────────────────────────────────────────

export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export const registerSchema = z.object({
  name: nameSchema,
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(50, "Username must be at most 50 characters")
    .regex(/^[A-Za-z0-9_\-]+$/, "Username may only contain letters, digits, underscores, and hyphens"),
  password: passwordSchema,
  role: z.enum(["admin", "staff"]),
});

export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;

