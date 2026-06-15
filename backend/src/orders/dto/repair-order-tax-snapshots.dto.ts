import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsNumber, IsOptional, Max, Min } from "class-validator";

export class RepairOrderTaxSnapshotsDto {
  @ApiPropertyOptional({
    example: 0.13,
    description: "Optional decimal tax rate override for repairing legacy orders.",
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  taxRate?: number;
}