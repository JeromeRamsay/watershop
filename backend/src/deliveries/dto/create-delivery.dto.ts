import { ApiProperty } from "@nestjs/swagger";
import {
  IsString,
  IsMongoId,
  IsDateString,
  IsEnum,
  IsOptional,
  ValidateNested,
  IsObject,
} from "class-validator";
import { Type } from "class-transformer";

class DeliveryAddressDto {
  @ApiProperty()
  @IsString()
  street: string;

  @ApiProperty()
  @IsString()
  city: string;

  @ApiProperty()
  @IsString()
  state: string;

  @ApiProperty()
  @IsString()
  zipCode: string;

  @ApiProperty()
  @IsString()
  country: string;
}

export class CreateDeliveryDto {
  @ApiProperty({ example: "64b1f... (Order ID)" })
  @IsMongoId()
  orderId: string;

  @ApiProperty({ example: "64b1f... (Customer ID)", required: false })
  @IsOptional()
  @IsMongoId()
  customerId?: string;

  @ApiProperty({ type: DeliveryAddressDto })
  @IsObject()
  @ValidateNested()
  @Type(() => DeliveryAddressDto)
  address: DeliveryAddressDto;

  @ApiProperty()
  @IsDateString()
  scheduledDate: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  timeSlot?: string;

  @ApiProperty({
    enum: ["scheduled", "out_for_delivery", "delivered"],
    default: "scheduled",
  })
  @IsOptional()
  @IsEnum(["scheduled", "out_for_delivery", "delivered", "failed", "cancelled"])
  status?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  deliveryNotes?: string;
}
