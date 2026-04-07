import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

export type InventoryDocument = Inventory & Document;

@Schema({ timestamps: true })
export class Inventory {
  @Prop({ required: true })
  name: string; // e.g. "18L Alkalized Water"

  @Prop({ required: true, unique: true })
  sku: string; // Stock Keeping Unit (Unique Barcode/ID)

  @Prop({ required: true })
  category: string; // e.g. "Water", "Bottles", "Salt"

  @Prop()
  description: string;

  @Prop({ required: true, default: 0 })
  stockQuantity: number;

  @Prop({ required: true, enum: ["piece", "case", "kg", "refill"] })
  unitType: string;

  @Prop({ default: 10 })
  lowStockThreshold: number; // Alert when stock drops below this

  @Prop({ required: true })
  purchasePrice: number; // Cost to you

  @Prop({ required: true })
  sellingPrice: number; // Price for customer

  @Prop()
  supplier: string;

  @Prop({ default: true })
  isTaxable: boolean;

  @Prop({ default: false })
  isRefillable: boolean;

  @Prop({ default: 0 })
  refillPrice: number;

  @Prop({ default: 0 })
  rentalPrice: number;

  @Prop({ default: true })
  isActive: boolean; // Soft delete: hide from POS without deleting history
}

export const InventorySchema = SchemaFactory.createForClass(Inventory);
