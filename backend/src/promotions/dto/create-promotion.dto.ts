import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from "class-validator";

export class CreatePromotionDto {
  @ApiPropertyOptional({ description: "Promotion name — auto-generated as wwpromo{4 digits} if omitted" })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: "Promotion description" })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: "Inventory item id this promotion applies to" })
  @IsMongoId()
  inventoryItem: string;

  @ApiProperty({ enum: ["percent", "fixed"], description: "Discount type" })
  @IsEnum(["percent", "fixed"])
  discountType: string;

  @ApiProperty({ description: "Discount value (% or $ amount)", minimum: 0 })
  @IsNumber()
  @Min(0)
  discountValue: number;

  @ApiProperty({ description: "Promotion start date (ISO)" })
  @IsDateString()
  startDate: string;

  @ApiProperty({ description: "Promotion end date (ISO)" })
  @IsDateString()
  endDate: string;

  @ApiPropertyOptional({ description: "Minimum quantity required per order to qualify", minimum: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  minQuantity?: number;

  @ApiPropertyOptional({ description: "Maximum quantity allowed per order to qualify (null = no limit)" })
  @IsOptional()
  @IsNumber()
  @Min(1)
  maxQuantity?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
