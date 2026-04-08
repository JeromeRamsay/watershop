import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type OrderDocument = Order & Document;

@Schema({ _id: false })
export class OrderItem {
  @Prop({ type: Types.ObjectId, ref: "Inventory", required: true })
  item: Types.ObjectId;

  @Prop({ required: true })
  name: string; // Snapshot of item name

  @Prop({ required: true })
  sku: string; // Snapshot of SKU

  @Prop({ required: true, min: 0 })
  quantity: number;

  @Prop({ required: true })
  unitPrice: number; // Snapshot of price at moment of sale

  @Prop({ required: true })
  totalPrice: number; // quantity * unitPrice

  @Prop({ default: false })
  isPrepaidRedemption: boolean;

  @Prop({ default: false })
  isRefill: boolean;
}

@Schema({ timestamps: true })
export class Order {
  @Prop({ unique: true })
  orderNumber: string; // generated automatically e.g., "ORD-1738291"

  @Prop({ type: Types.ObjectId, ref: "Customer" })
  customer?: Types.ObjectId;

  @Prop({ default: false })
  isWalkIn: boolean;

  @Prop({ type: Types.ObjectId, ref: "User" }) // The cashier
  cashier: Types.ObjectId;

  @Prop({ type: [SchemaFactory.createForClass(OrderItem)] })
  items: OrderItem[];

  @Prop({ type: [SchemaFactory.createForClass(OrderItem)] })
  refills: OrderItem[];

  @Prop({ default: 0 })
  refillCount: number;

  // Financials
  @Prop({ required: true })
  subTotal: number;

  @Prop({ default: 0 })
  discount: number;

  @Prop({ required: true })
  grandTotal: number;

  // Statuses
  @Prop({
    enum: ["pending", "scheduled", "completed", "cancelled"],
    default: "completed",
  })
  status: string;

  @Prop({ enum: ["paid", "unpaid", "partial", "pending"], default: "paid" })
  paymentStatus: string;

  @Prop({ default: 0 })
  amountPaid: number;

  @Prop({
    enum: ["cash", "card", "credit_redemption", "store_credit"],
    required: true,
  })
  paymentMethod: string;

  // Flags
  @Prop({ default: false })
  isPrepaidRedemption: boolean; // TRUE if using Bottle Credits

  @Prop({ default: false })
  isDelivery: boolean;

  @Prop({ type: Types.ObjectId, ref: "Delivery" })
  deliveryId?: Types.ObjectId;

  @Prop()
  deliveryAddress?: string;

  @Prop()
  deliveryDate?: Date;

  @Prop({ default: false })
  emailReceipt: boolean;

  @Prop({ type: Object })
  paymentDetails: any;
}

export const OrderSchema = SchemaFactory.createForClass(Order);
