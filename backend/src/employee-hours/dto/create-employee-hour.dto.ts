import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsDateString, IsMongoId, IsNumber, IsOptional, IsString, Max, Min } from "class-validator";

export class CreateEmployeeHourDto {
  @ApiProperty({ description: "Employee user id" })
  @IsMongoId()
  userId: string;

  @ApiProperty({ description: "Work date in ISO format" })
  @IsDateString()
  workDate: string;

  @ApiProperty({ description: "Hours worked", minimum: 0, maximum: 24 })
  @IsNumber()
  @Min(0)
  @Max(24)
  hours: number;

  @ApiPropertyOptional({ description: "Optional notes" })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: "User id who created this entry" })
  @IsOptional()
  @IsMongoId()
  createdBy?: string;
}
