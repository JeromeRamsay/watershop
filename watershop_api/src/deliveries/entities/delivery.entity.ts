import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type DeliveryDocument = Delivery & Document;

// Helper Schema for Address snapshot
@Schema({ _id: false })
class DeliveryAddress {
  @Prop()
  street: string;

  @Prop()
  city: string;

  @Prop()
  state: string;

  @Prop()
  zipCode: string;

  @Prop()
  country: string;
}

@Schema({ timestamps: true })
export class Delivery {
  @Prop({ type: Types.ObjectId, ref: "Order", required: true })
  order: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "Customer", required: true })
  customer: Types.ObjectId;

  @Prop({ type: DeliveryAddress, required: true })
  address: DeliveryAddress;

  @Prop({ required: true })
  scheduledDate: Date;

  @Prop()
  timeSlot: string; // e.g., "Morning (9-12)"

  @Prop({
    enum: ["scheduled", "out_for_delivery", "delivered", "failed", "cancelled"],
    default: "scheduled",
  })
  status: string;

  @Prop()
  deliveryNotes: string;

  @Prop({ type: Types.ObjectId, ref: "User" })
  assignedDriver: Types.ObjectId; // Optional: if you assign specific staff later
}

export const DeliverySchema = SchemaFactory.createForClass(Delivery);
