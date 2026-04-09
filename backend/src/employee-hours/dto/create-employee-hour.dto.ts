import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsDateString, IsMongoId, IsNumber, IsOptional, IsString, Matches, Max, Min } from "class-validator";

export class CreateEmployeeHourDto {
  @ApiProperty({ description: "Employee user id" })
  @IsMongoId()
  userId: string;

  @ApiProperty({ description: "Work date in ISO format" })
  @IsDateString()
  workDate: string;

  @ApiPropertyOptional({ description: "Start time in HH:MM 24-hour format" })
  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: "startTime must be HH:MM" })
  startTime?: string;

  @ApiPropertyOptional({ description: "End time in HH:MM 24-hour format" })
  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: "endTime must be HH:MM" })
  endTime?: string;

  @ApiPropertyOptional({ description: "Hours worked (computed from start/end if omitted)", minimum: 0, maximum: 24 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(24)
  hours?: number;

  @ApiPropertyOptional({ description: "Optional notes" })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: "User id who created this entry" })
  @IsOptional()
  @IsMongoId()
  createdBy?: string;
}
