import { Controller, Get, Post, Body, Patch, Param, Query } from "@nestjs/common";
import { UsersService } from "./users.service";
import { RegisterDto, LoginDto } from "./dto/auth.dto";
import { ApiTags, ApiOperation } from "@nestjs/swagger";
import { CreateManagedUserDto, UpdateManagedUserDto } from "./dto/manage-user.dto";
import { Public } from "../auth/public.decorator";

@ApiTags("Users & Auth")
@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Public()
  @Post("register")
  @ApiOperation({ summary: "Register new staff/admin" })
  register(@Body() registerDto: RegisterDto) {
    return this.usersService.register(registerDto);
  }

  @Public()
  @Post("login")
  @ApiOperation({ summary: "Login to get Access Token" })
  login(@Body() loginDto: LoginDto) {
    return this.usersService.login(loginDto);
  }

  @Get()
  @ApiOperation({ summary: "List all users" })
  findAll() {
    return this.usersService.findAll();
  }

  @Get("staff")
  @ApiOperation({ summary: "List all staff users" })
  findStaff(@Query("includeInactive") includeInactive?: string) {
    return this.usersService.findStaff(includeInactive !== "false");
  }

  @Post("staff")
  @ApiOperation({ summary: "Create staff/admin account from admin section" })
  createManagedUser(@Body() createManagedUserDto: CreateManagedUserDto) {
    return this.usersService.createManagedUser(createManagedUserDto);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update user account details" })
  updateManagedUser(
    @Param("id") id: string,
    @Body() updateManagedUserDto: UpdateManagedUserDto,
  ) {
    return this.usersService.updateManagedUser(id, updateManagedUserDto);
  }

  @Patch(":id/deactivate")
  @ApiOperation({ summary: "Deactivate user account" })
  deactivate(@Param("id") id: string) {
    return this.usersService.setActiveStatus(id, false);
  }

  @Patch(":id/activate")
  @ApiOperation({ summary: "Activate user account" })
  activate(@Param("id") id: string) {
    return this.usersService.setActiveStatus(id, true);
  }

  @Patch(":id/archive")
  @ApiOperation({ summary: "Archive a staff account without removing historical records" })
  archiveManagedUser(@Param("id") id: string) {
    return this.usersService.archiveManagedUser(id);
  }

  @Get("login-activity")
  @ApiOperation({ summary: "Get user account and login activity" })
  loginActivity(@Query("limit") limit?: string) {
    return this.usersService.getLoginActivity(limit ? Number(limit) : 50);
  }
}
