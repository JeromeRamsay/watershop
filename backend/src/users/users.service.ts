import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  NotFoundException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { User, UserDocument } from "./entities/user.entity";
import { RegisterDto, LoginDto } from "./dto/auth.dto";
import { CreateManagedUserDto, UpdateManagedUserDto } from "./dto/manage-user.dto";
import * as bcrypt from "bcrypt";
import { JwtService } from "@nestjs/jwt";
import { RealtimeService } from "../realtime/realtime.service";

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private jwtService: JwtService, // Helper to generate tokens
    private realtimeService: RealtimeService,
  ) {}

  // 1. REGISTER
  async register(registerDto: RegisterDto) {
    const { username, password } = registerDto;

    // Check if user exists
    const existing = await this.userModel.findOne({ username });
    if (existing) throw new BadRequestException("Username already taken");

    // Hash Password
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new this.userModel({
      ...registerDto,
      password: hashedPassword,
    });

    await newUser.save();
    this.realtimeService.emitDashboardUpdate("users.registered");
    return { message: "User registered successfully" };
  }

  // 2. LOGIN
  async login(loginDto: LoginDto) {
    const { username, password } = loginDto;

    // Find User (include password field explicitly if set to select: false)
    const user = await this.userModel.findOne({ username });
    if (!user) throw new UnauthorizedException("Invalid credentials");
    if (user.archivedAt) {
      throw new UnauthorizedException("Account is deactivated");
    }
    if (!user.isActive) throw new UnauthorizedException("Account is deactivated");

    // Compare Password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) throw new UnauthorizedException("Invalid credentials");

    // Generate Token
    const payload = { sub: user._id, username: user.username, role: user.role };

    user.lastLoginAt = new Date();
    user.loginCount = (user.loginCount || 0) + 1;
    await user.save();
    this.realtimeService.emitDashboardUpdate("users.logged_in");

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user._id,
        name: `${user.firstName} ${user.lastName}`,
        role: user.role,
      },
    };
  }

  async findAll() {
    return this.userModel.find().select("-password"); // Hide passwords
  }

  async findStaff(includeInactive = true) {
    const query: Record<string, unknown> = {
      role: { $regex: /^staff$/i },
      archivedAt: null,
    };
    if (!includeInactive) {
      query.isActive = true;
    }
    return this.userModel.find(query).select("-password").sort({ createdAt: -1 });
  }

  async createManagedUser(createDto: CreateManagedUserDto) {
    const existing = await this.userModel.findOne({ username: createDto.username });
    if (existing) throw new BadRequestException("Username already taken");

    const hashedPassword = await bcrypt.hash(createDto.password, 10);
    const user = new this.userModel({
      ...createDto,
      role: createDto.role || "staff",
      isActive: createDto.isActive ?? true,
      password: hashedPassword,
    });
    await user.save();
    this.realtimeService.emitDashboardUpdate("users.created");
    return {
      message: "User created successfully",
      user: await this.userModel.findById(user._id).select("-password"),
    };
  }

  async updateManagedUser(id: string, updateDto: UpdateManagedUserDto) {
    const payload: Record<string, unknown> = { ...updateDto };

    if (updateDto.password) {
      payload.password = await bcrypt.hash(updateDto.password, 10);
    }

    if (updateDto.username) {
      const existing = await this.userModel.findOne({
        username: updateDto.username,
        _id: { $ne: id },
      });
      if (existing) throw new BadRequestException("Username already taken");
    }

    const updated = await this.userModel
      .findByIdAndUpdate(id, payload, { new: true })
      .select("-password");
    if (!updated) {
      throw new NotFoundException("User not found");
    }
    this.realtimeService.emitDashboardUpdate("users.updated");
    return updated;
  }

  async setActiveStatus(id: string, isActive: boolean) {
    const updated = await this.userModel
      .findByIdAndUpdate(id, { isActive }, { new: true })
      .select("-password");
    if (!updated) {
      throw new NotFoundException("User not found");
    }
    this.realtimeService.emitDashboardUpdate("users.status_changed");
    return updated;
  }

  async archiveManagedUser(id: string) {
    const updated = await this.userModel
      .findByIdAndUpdate(
        id,
        { isActive: false, archivedAt: new Date() },
        { new: true },
      )
      .select("-password");

    if (!updated) {
      throw new NotFoundException("User not found");
    }

    if (updated.role.toLowerCase() !== "staff") {
      throw new BadRequestException("Only staff accounts can be permanently deleted");
    }

    this.realtimeService.emitDashboardUpdate("users.archived");
    return updated;
  }

  async getLoginActivity(limit = 50) {
    const safeLimit = Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 200) : 50;
    return this.userModel
      .find()
      .select("firstName lastName username role isActive createdAt lastLoginAt loginCount")
      .sort({ lastLoginAt: -1, createdAt: -1 })
      .limit(safeLimit);
  }
}
