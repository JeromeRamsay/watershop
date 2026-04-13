import { ApiProperty } from "@nestjs/swagger";
import { IsString, MinLength } from "class-validator";

export class ChangePasswordDto {
  @ApiProperty({ example: "currentSecret123" })
  @IsString()
  currentPassword: string;

  @ApiProperty({ example: "newSecret123" })
  @IsString()
  @MinLength(6)
  newPassword: string;
}
