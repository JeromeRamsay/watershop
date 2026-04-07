import { ApiProperty } from "@nestjs/swagger";
import { IsString, MinLength, IsEnum, IsOptional } from "class-validator";

export class LoginDto {
  @ApiProperty({ example: "admin" })
  @IsString()
  username: string;

  @ApiProperty({ example: "secret123" })
  @IsString()
  password: string;
}

export class RegisterDto {
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

  @ApiProperty({ enum: ["admin", "staff"], default: "staff" })
  @IsOptional()
  @IsEnum(["admin", "staff"])
  role?: string;
}
