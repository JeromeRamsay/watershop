import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type RefillOverrideDocument = RefillOverride & Document;

@Schema({ timestamps: true })
export class RefillOverride {
  @Prop({ type: Types.ObjectId, ref: "Customer", required: true, index: true })
  customer: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "Inventory", required: true, index: true })
  itemId: Types.ObjectId;

  @Prop({ required: true })
  itemName: string;

  @Prop({ required: true })
  quantityDelta: number;

  @Prop({ type: Types.ObjectId, ref: "User", required: true, index: true })
  actedBy: Types.ObjectId;

  @Prop()
  notes?: string;

  @Prop({ required: true, default: "manual_override" })
  source: string;
}

export const RefillOverrideSchema = SchemaFactory.createForClass(RefillOverride);
RefillOverrideSchema.index({ customer: 1, itemId: 1, createdAt: -1 });
RefillOverrideSchema.index({ actedBy: 1, createdAt: -1 });