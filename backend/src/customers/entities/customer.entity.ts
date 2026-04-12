import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type CustomerDocument = Customer & Document;

// 1. Nested Schema: Address
@Schema({ _id: false }) // _id: false because we don't need a unique ID for every address sub-document
export class Address {
  @Prop()
  label: string; // e.g. "Home", "Office"

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

  @Prop({ default: false })
  isDefault: boolean;
}

// 2. Nested Schema: Family Member
@Schema({ _id: false })
export class FamilyMember {
  @Prop()
  firstName: string;

  @Prop()
  lastName: string;

  @Prop()
  name: string; // kept for backward compatibility with existing records

  @Prop()
  relationship: string; // e.g. "Wife", "Driver"

  @Prop()
  phone: string;

  @Prop()
  email: string;

  @Prop({ default: false })
  allowCreditUse: boolean; // Can this person use the main account's credits?
}

// 3. Nested Schema: Wallet / Credits System
@Schema({ _id: false })
export class PrepaidItem {
  @Prop({ type: Types.ObjectId, ref: "Inventory" }) // Reference to Inventory Item
  itemId: Types.ObjectId;

  @Prop()
  itemName: string; // Snapshot of name for display

  @Prop({ default: 0 })
  quantityRemaining: number;

  @Prop()
  expiryDate?: Date;
}

@Schema({ _id: false })
export class Wallet {
  @Prop({ default: 0 })
  storeCredit: number; // Cash balance (e.g., $50.00)

  @Prop({ type: [SchemaFactory.createForClass(PrepaidItem)], default: [] })
  prepaidItems: PrepaidItem[]; // Array of prepaid bundles
}

// 4. Main Customer Schema
@Schema({ timestamps: true })
export class Customer {
  @Prop({
    required: true,
    enum: ["individual", "business"],
    default: "individual",
  })
  type: string;

  @Prop({ required: true })
  firstName: string;

  @Prop({ required: true })
  lastName: string;

  @Prop({ unique: true, required: true })
  email: string;

  @Prop({ unique: true, required: true })
  phone: string;
  
  @Prop()
  notes?: string;

  @Prop({ type: [SchemaFactory.createForClass(Address)], default: [] })
  addresses: Address[];

  @Prop({ type: [SchemaFactory.createForClass(FamilyMember)], default: [] })
  familyMembers: FamilyMember[];

  @Prop({
    type: SchemaFactory.createForClass(Wallet),
    default: () => ({ storeCredit: 0, prepaidItems: [] }),
  })
  wallet: Wallet;

  @Prop()
  lastVisit: Date;
}

export const CustomerSchema = SchemaFactory.createForClass(Customer);
CustomerSchema.index({ createdAt: -1 });
CustomerSchema.index({ firstName: 1, lastName: 1 });
