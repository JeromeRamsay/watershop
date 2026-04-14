import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from "class-validator";

export class ReportClientErrorDto {
  @ApiProperty({ example: "Failed to load employees page data" })
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  message: string;

  @ApiPropertyOptional({ example: "/dashboard/employees" })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  route?: string;

  @ApiPropertyOptional({ example: "window.error" })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  source?: string;

  @ApiPropertyOptional({ enum: ["error", "warn"], default: "error" })
  @IsOptional()
  @IsIn(["error", "warn"])
  level?: "error" | "warn";

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(12000)
  stack?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(12000)
  componentStack?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  requestId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  userAgent?: string;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}