import { PartialType } from "@nestjs/mapped-types";
import { CreateOrderDto } from "./create-order.dto";
import { IsEnum, IsNumber, IsOptional, Min } from "class-validator";

export class UpdateOrderDto extends PartialType(CreateOrderDto) {
  @IsOptional()
  @IsEnum(["pending", "scheduled", "completed", "cancelled"])
  status?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  amountPaid?: number;
}
