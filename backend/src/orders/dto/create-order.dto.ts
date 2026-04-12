import { ApiProperty } from "@nestjs/swagger";
import {
  IsString,
  IsNumber,
  IsEnum,
  IsBoolean,
  IsOptional,
  IsArray,
  ValidateNested,
  IsMongoId,
  Min,
  IsDateString,
} from "class-validator";
import { Type } from "class-transformer";

class OrderItemDto {
  @ApiProperty({ example: "64b1f... (Inventory ID)" })
  @IsMongoId()
  itemId: string;

  @ApiProperty({ example: 2 })
  @IsNumber()
  @Min(0)
  quantity: number;

  @ApiProperty({ default: false })
  @IsOptional()
  @IsBoolean()
  isPrepaidRedemption?: boolean;

  @ApiProperty({ default: false })
  @IsOptional()
  @IsBoolean()
  isRefill?: boolean;
}

export class CreateOrderDto {
  @ApiProperty({ example: "64b1f... (Customer ID)", required: false })
  @IsOptional()
  @IsMongoId()
  customerId?: string;

  @ApiProperty({ type: [OrderItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @ApiProperty({
    enum: ["cash", "card", "credit_redemption", "store_credit"],
    example: "cash",
  })
  @IsEnum(["cash", "card", "credit_redemption", "store_credit"])
  paymentMethod: string;

  @ApiProperty({ example: 0 })
  @IsOptional()
  @IsNumber()
  discount?: number;

  @ApiProperty({
    default: false,
    description: "Set TRUE to use Customer's Wallet Credits",
  })
  @IsOptional()
  @IsBoolean()
  isPrepaidRedemption?: boolean;

  @ApiProperty({
    enum: ["paid", "unpaid", "pending"],
    example: "paid",
    required: false,
  })
  @IsOptional()
  @IsEnum(["paid", "unpaid", "pending", "partial"])
  paymentStatus?: string;

  @ApiProperty({ default: false })
  @IsOptional()
  @IsBoolean()
  isDelivery?: boolean;

  @ApiProperty({ example: "123 Water St, Woodstock, NY", required: false })
  @IsOptional()
  @IsString()
  deliveryAddress?: string;
  
  @ApiProperty({ example: "Leave at the side entrance.", required: false })
  @IsOptional()
  @IsString()
  deliveryNotes?: string;

  // New field to capture when they want it delivered
  @ApiProperty({ example: "2025-10-25", required: false })
  @IsOptional()
  @IsDateString()
  deliveryDate?: string;
  
  @ApiProperty({ example: "Customer requested a call before delivery.", required: false })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  emailReceipt?: boolean;

  @ApiProperty({ default: false, required: false })
  @IsOptional()
  @IsBoolean()
  refillRedemption?: boolean;

  @ApiProperty({ default: false, required: false })
  @IsOptional()
  @IsBoolean()
  skipRefillCreditTopup?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  paymentDetails?: any;
}
