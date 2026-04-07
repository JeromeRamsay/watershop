import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

export type SettingDocument = Setting & Document;

@Schema()
export class Setting {
  @Prop({ required: true, default: "Woodstock Water Shop" })
  storeName: string;

  @Prop({ required: true, default: "USD" })
  currency: string; // e.g. "$", "EGP"

  @Prop({ required: true, default: 0 })
  taxRate: number; // e.g. 0.14 for 14%

  @Prop({ default: "Thank you for your business!" })
  receiptFooter: string;

  @Prop({ default: true })
  enableLowStockAlerts: boolean;

  @Prop()
  contactPhone: string;

  @Prop()
  contactEmail: string;

  // Store Hours (useful for delivery scheduling limits later)
  @Prop({ type: Object })
  operatingHours: {
    open: string; // "09:00"
    close: string; // "21:00"
  };
}

export const SettingSchema = SchemaFactory.createForClass(Setting);
