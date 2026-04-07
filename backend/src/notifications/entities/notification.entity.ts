import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type NotificationDocument = Notification & Document;

@Schema({ timestamps: true })
export class Notification {
  @Prop({ required: true })
  message: string;

  @Prop({ enum: ["low_stock", "out_of_stock", "refill_order"], required: true })
  type: string;

  @Prop({ type: Types.ObjectId, ref: "Inventory" })
  inventoryItemId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "Order" })
  orderId?: Types.ObjectId;

  @Prop()
  paymentStatus?: string;

  @Prop({ default: false })
  resolved: boolean;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);
