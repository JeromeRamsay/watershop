import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type EmployeeHourDocument = EmployeeHour & Document;

@Schema({ timestamps: true })
export class EmployeeHour {
  @Prop({ type: Types.ObjectId, ref: "User", required: true })
  user: Types.ObjectId;

  @Prop({ required: true })
  workDate: Date;

  @Prop({ required: true, min: 0, max: 24 })
  hours: number;

  @Prop({ default: "" })
  notes: string;

  @Prop({ type: Types.ObjectId, ref: "User", required: false })
  createdBy?: Types.ObjectId;
}

export const EmployeeHourSchema = SchemaFactory.createForClass(EmployeeHour);
