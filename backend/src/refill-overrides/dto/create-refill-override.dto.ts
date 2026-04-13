import { ApiProperty } from "@nestjs/swagger";
import { IsInt, IsMongoId, IsNotEmpty, IsOptional, IsString, NotEquals } from "class-validator";

export class CreateRefillOverrideDto {
  @ApiProperty({ example: "664f0f3ce2d8f2c3d4e5f601" })
  @IsMongoId()
  customerId: string;

  @ApiProperty({ example: "664f0f3ce2d8f2c3d4e5f777" })
  @IsMongoId()
  itemId: string;

  @ApiProperty({ example: 1, description: "Signed quantity adjustment. Use negative values to subtract remaining refills." })
  @IsInt()
  @NotEquals(0)
  quantityDelta: number;

  @ApiProperty({ required: false, example: "Customer service courtesy adjustment" })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  notes?: string;
}