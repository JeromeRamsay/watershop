import { ApiProperty } from "@nestjs/swagger";
import {
  IsArray,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";

class RefillItemDto {
  @ApiProperty({ example: "64b1f... (Inventory ID)" })
  @IsMongoId()
  itemId: string;

  @ApiProperty({ example: 1 })
  @IsNumber()
  @Min(1)
  quantity: number;
}

export class CreateRefillDto {
  @ApiProperty({ example: "4161231234" })
  @IsString()
  phone: string;

  @ApiProperty({ example: "John King", required: false })
  @IsOptional()
  @IsString()
  memberName?: string;

  @ApiProperty({ type: [RefillItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RefillItemDto)
  items: RefillItemDto[];
}
