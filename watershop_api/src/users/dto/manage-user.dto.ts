import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import { IsBoolean, IsEnum, IsOptional, IsString, MinLength } from "class-validator";

export class CreateManagedUserDto {
  @ApiProperty()
  @IsString()
  firstName: string;

  @ApiProperty()
  @IsString()
  lastName: string;

  @ApiProperty()
  @IsString()
  username: string;

  @ApiProperty()
  @IsString()
  @MinLength(6)
  password: string;

  @ApiPropertyOptional({ enum: ["admin", "staff"], default: "staff" })
  @IsOptional()
  @IsEnum(["admin", "staff"])
  role?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateManagedUserDto extends PartialType(CreateManagedUserDto) {}
