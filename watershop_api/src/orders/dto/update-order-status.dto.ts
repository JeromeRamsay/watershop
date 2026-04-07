import { ApiProperty } from "@nestjs/swagger";
import { IsEnum } from "class-validator";

export class UpdateOrderStatusDto {
  @ApiProperty({ enum: ["pending", "scheduled", "completed", "cancelled"] })
  @IsEnum(["pending", "scheduled", "completed", "cancelled"])
  status: string;
}
