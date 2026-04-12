import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsString,
  IsEmail,
  IsEnum,
  IsOptional,
  IsArray,
  ValidateNested,
  IsBoolean,
  IsNumber,
  IsMongoId,
  Min,
} from "class-validator";

// --- 1. Address DTO ---
class AddressDto {
  @ApiProperty({ example: "Home" })
  @IsString()
  label: string;

  @ApiProperty({ example: "123 Water St" })
  @IsString()
  street: string;

  @ApiProperty({ example: "Woodstock" })
  @IsString()
  city: string;

  @ApiProperty({ example: "NY" })
  @IsString()
  state: string;

  @ApiProperty({ example: "12400" })
  @IsString()
  zipCode: string;

  @ApiProperty({ example: "USA" })
  @IsString()
  country: string;

  @ApiProperty({ required: false, default: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

// --- 2. Family Member DTO ---
class FamilyMemberDto {
  @ApiProperty({ example: "Jane" })
  @IsString()
  firstName: string;

  @ApiProperty({ example: "Doe" })
  @IsString()
  lastName: string;

  @ApiProperty({ example: "Jane Doe", required: false, description: "Legacy field — ignored when firstName/lastName are provided" })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ example: "Wife" })
  @IsString()
  relationship: string;

  @ApiProperty({ example: "555-999-8888" })
  @IsString()
  phone: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ required: false, default: false })
  @IsOptional()
  @IsBoolean()
  allowCreditUse?: boolean;
}

// --- 3. Wallet DTOs (The Missing Part) ---
class PrepaidItemDto {
  @IsMongoId()
  itemId: string;

  @IsString()
  itemName: string;

  @IsNumber()
  quantityRemaining: number;
}

class WalletDto {
  @IsNumber()
  storeCredit: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PrepaidItemDto)
  prepaidItems: PrepaidItemDto[];
}

// --- 4. Main DTO ---
export class CreateCustomerDto {
  @ApiProperty({ enum: ["individual", "business"], default: "individual" })
  @IsEnum(["individual", "business"])
  type: string;

  @ApiProperty({ example: "John" })
  @IsString()
  firstName: string;

  @ApiProperty({ example: "Doe" })
  @IsString()
  lastName: string;

  @ApiProperty({ example: "john.doe@example.com" })
  @IsEmail()
  email: string;

  @ApiProperty({ example: "555-123-4567" })
  @IsString()
  phone: string;
  
  @ApiProperty({ required: false, description: "Internal customer notes" })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ type: [AddressDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AddressDto)
  addresses?: AddressDto[];

  @ApiProperty({ type: [FamilyMemberDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FamilyMemberDto)
  familyMembers?: FamilyMemberDto[];

  // --- ADD THIS FIELD ---
  @ApiProperty({
    required: false,
    description: "Internal use for wallet/credits",
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => WalletDto)
  wallet?: WalletDto;
}
