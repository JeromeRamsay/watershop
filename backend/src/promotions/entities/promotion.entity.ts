import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type PromotionDocument = Promotion & Document;

@Schema({ timestamps: true })
export class Promotion {
  @Prop({ required: true })
  name: string;

  @Prop({ default: "" })
  description: string;

  @Prop({ type: Types.ObjectId, ref: "Inventory", required: true })
  inventoryItem: Types.ObjectId;

  @Prop({ enum: ["percent", "fixed"], required: true })
  discountType: string;

  @Prop({ required: true, min: 0 })
  discountValue: number;

  @Prop({ required: true })
  startDate: Date;

  @Prop({ required: true })
  endDate: Date;

  @Prop({ default: 1, min: 1 })
  minQuantity: number;

  @Prop({ type: Number, default: null })
  maxQuantity: number | null;

  @Prop({ default: true })
  isActive: boolean;
}

export const PromotionSchema = SchemaFactory.createForClass(Promotion);
PromotionSchema.index({ inventoryItem: 1, isActive: 1, startDate: 1, endDate: 1 });
