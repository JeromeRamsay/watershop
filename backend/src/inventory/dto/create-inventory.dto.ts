import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsString,
  IsNumber,
  IsEnum,
  IsBoolean,
  IsInt,
  IsOptional,
  Min,
  ValidateNested,
} from "class-validator";

class PolicyDetailsDto {
  @ApiProperty({ required: false, example: "Covers parts and labor for defects in materials and workmanship." })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false, example: 10 })
  @IsOptional()
  @IsInt()
  @Min(0)
  periodYears?: number;

  @ApiProperty({ required: false, example: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  periodMonths?: number;
}

export class CreateInventoryDto {
  @ApiProperty({ example: "18L Alkalized Water Refill" })
  @IsString()
  name: string;

  @ApiProperty({ example: "WAT-18L-REF" })
  @IsString()
  sku: string;

  @ApiProperty({ example: "Water" })
  @IsString()
  category: string;

  @ApiProperty({ example: "Refill for standard 18L bottle", required: false })
  @IsOptional()
  @IsString()
  description?: string;
  
  @ApiProperty({ required: false, type: PolicyDetailsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => PolicyDetailsDto)
  warranty?: PolicyDetailsDto;

  @ApiProperty({ required: false, type: PolicyDetailsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => PolicyDetailsDto)
  returnPolicy?: PolicyDetailsDto;

  @ApiProperty({ example: 100 })
  @IsNumber()
  @Min(0)
  stockQuantity: number;

  @ApiProperty({ enum: ["piece", "case", "kg", "refill"], example: "refill" })
  @IsEnum(["piece", "case", "kg", "refill"])
  unitType: string;

  @ApiProperty({
    example: 10,
    description: "Alert when stock is lower than this",
  })
  @IsNumber()
  lowStockThreshold: number;

  @ApiProperty({ example: 2.5 })
  @IsNumber()
  @Min(0)
  purchasePrice: number;

  @ApiProperty({ example: 5.0 })
  @IsNumber()
  @Min(0)
  sellingPrice: number;

  @ApiProperty({ example: "AquaPure Suppliers", required: false })
  @IsOptional()
  @IsString()
  supplier?: string;

  @ApiProperty({ default: false })
  @IsBoolean()
  isRefillable: boolean;

  @ApiProperty({ default: 0 })
  @IsNumber()
  @Min(0)
  refillPrice: number;

  @ApiProperty({ default: 0 })
  @IsNumber()
  @Min(0)
  rentalPrice: number;

  @ApiProperty({ default: true })
  @IsBoolean()
  isTaxable: boolean;

  @ApiProperty({ default: true })
  @IsBoolean()
  isActive: boolean;
}
