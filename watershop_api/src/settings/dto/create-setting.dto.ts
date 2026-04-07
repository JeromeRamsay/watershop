import { ApiProperty } from "@nestjs/swagger";
import {
  IsString,
  IsNumber,
  IsBoolean,
  IsOptional,
  IsObject,
} from "class-validator";

export class CreateSettingDto {
  @ApiProperty({ example: "Woodstock Water Shop" })
  @IsString()
  storeName: string;

  @ApiProperty({ example: "EGP" })
  @IsString()
  currency: string;

  @ApiProperty({ example: 0.14, description: "Decimal format (0.14 = 14%)" })
  @IsNumber()
  taxRate: number;

  @ApiProperty({ example: "Thank you for visiting!" })
  @IsString()
  receiptFooter: string;

  @ApiProperty({ default: true })
  @IsBoolean()
  enableLowStockAlerts: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  contactPhone?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsObject()
  operatingHours?: {
    open: string;
    close: string;
  };
}
